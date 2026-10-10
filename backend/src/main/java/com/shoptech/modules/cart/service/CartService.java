package com.shoptech.modules.cart.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.util.Json;
import com.shoptech.modules.cart.dto.CartSummary;
import com.shoptech.modules.cart.entity.Cart;
import com.shoptech.modules.cart.entity.CartItem;
import com.shoptech.modules.cart.repository.CartItemRepository;
import com.shoptech.modules.cart.repository.CartRepository;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductImageRepository;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import com.shoptech.modules.product.service.ProductPricing;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Giỏ hàng lưu trong database (theo tài khoản). Giá và tồn kho luôn tính lại theo dữ liệu sản phẩm hiện tại. */
@Service
@RequiredArgsConstructor
public class CartService {

    private static final String OVER_STOCK = "Số lượng sản phẩm trong giỏ vượt quá tồn kho hiện tại.";

    private final CartRepository cartRepository;
    private final CartItemRepository itemRepository;
    private final ProductRepository productRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final ProductImageRepository imageRepository;
    private final Json json;

    @Transactional
    public CartSummary get(Long userId) {
        return summary(cartOf(userId));
    }

    /** Thêm vào giỏ: trùng sản phẩm + biến thể thì cộng dồn số lượng (không vượt tồn kho). */
    @Transactional
    public CartSummary add(Long userId, Integer productId, String rawSku, Integer quantity) {
        if (productId == null) {
            throw ValidationException.of("product_id", "Vui lòng chọn sản phẩm");
        }
        if (quantity == null || quantity < 1) {
            throw ValidationException.of("quantity", "Số lượng phải lớn hơn 0");
        }
        Product product = activeProduct(productId);
        String sku = rawSku == null ? "" : rawSku.trim();
        if (sku.length() > 100) {
            throw ValidationException.of("sku", "Mã biến thể không hợp lệ");
        }

        Cart cart = cartOf(userId);
        CartItem item = itemRepository.findFirstByCartIdAndProductIdAndSku(cart.getId(), productId, sku).orElse(null);
        int newQuantity = (item == null ? 0 : item.getQuantity()) + quantity;
        if (newQuantity > ProductPricing.stock(product, variantsOf(productId), sku)) {
            throw ApiException.unprocessable(OVER_STOCK);
        }

        if (item == null) {
            item = new CartItem();
            item.setCartId(cart.getId());
            item.setProductId(productId);
            item.setSku(sku);
        }
        item.setQuantity(newQuantity);
        itemRepository.save(item);
        return summary(cart);
    }

    @Transactional
    public CartSummary update(Long userId, Long itemId, Integer quantity) {
        CartItem item = owned(userId, itemId);
        if (quantity == null || quantity < 1) {
            throw ValidationException.of("quantity", "Số lượng phải lớn hơn 0");
        }
        Product product = activeProduct(item.getProductId());
        if (quantity > ProductPricing.stock(product, variantsOf(product.getId()), item.getSku())) {
            throw ApiException.unprocessable(OVER_STOCK);
        }
        item.setQuantity(quantity);
        itemRepository.save(item);
        return summary(cartOf(userId));
    }

    @Transactional
    public CartSummary remove(Long userId, Long itemId) {
        itemRepository.delete(owned(userId, itemId));
        return summary(cartOf(userId));
    }

    @Transactional
    public CartSummary clear(Long userId) {
        Cart cart = cartOf(userId);
        itemRepository.deleteByCartId(cart.getId());
        return CartSummary.empty();
    }

    // ------------------------------------------------------------------ helpers

    private CartSummary summary(Cart cart) {
        List<CartItem> items = itemRepository.findByCartIdOrderByIdAsc(cart.getId());
        if (items.isEmpty()) {
            return CartSummary.empty();
        }
        Set<Integer> productIds = items.stream().map(CartItem::getProductId).collect(Collectors.toSet());
        Map<Integer, Product> products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        Map<Integer, List<String>> images = imageRepository.findByProductIdIn(List.copyOf(productIds)).stream()
                .collect(Collectors.toMap(ProductImage::getProductId,
                        pi -> pi.getImages() == null ? List.of() : pi.getImages(), (a, b) -> a));

        List<CartSummary.Line> lines = new ArrayList<>();
        int totalQuantity = 0;
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem item : items) {
            Product product = products.get(item.getProductId());
            String sku = item.getSku() == null || item.getSku().isEmpty() ? null : item.getSku();
            if (product == null || !Objects.equals(product.getStatus(), 1)) {
                lines.add(new CartSummary.Line(item.getId(),
                        product == null ? null : new CartSummary.ProductRef(product.getId(), product.getName(), null, null, product.getStoreId()),
                        sku == null ? null : new CartSummary.Variant(sku, null),
                        item.getQuantity(), BigDecimal.ZERO, BigDecimal.ZERO, 0, true, false));
                continue;
            }
            List<Map<String, Object>> variants = variantsOf(product.getId());
            BigDecimal unitPrice = ProductPricing.unitPrice(product, variants, sku);
            int available = ProductPricing.stock(product, variants, sku);
            BigDecimal lineSubtotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2, RoundingMode.HALF_UP);
            boolean insufficient = item.getQuantity() > available;
            if (!insufficient) {
                totalQuantity += item.getQuantity();
                subtotal = subtotal.add(lineSubtotal);
            }
            List<String> imgs = images.getOrDefault(product.getId(), List.of());
            lines.add(new CartSummary.Line(item.getId(),
                    new CartSummary.ProductRef(product.getId(), product.getName(), product.getSlug(),
                            imgs.isEmpty() ? null : imgs.get(0), product.getStoreId()),
                    sku == null ? null : CartSummary.Variant.of(sku, ProductPricing.findVariant(variants, sku)),
                    item.getQuantity(), unitPrice, lineSubtotal, available, false, insufficient));
        }
        return new CartSummary(lines, lines.size(), totalQuantity, subtotal.setScale(2, RoundingMode.HALF_UP));
    }

    private List<Map<String, Object>> variantsOf(Integer productId) {
        return specificationRepository.findFirstByProductId(productId)
                .map(ProductSpecification::getVariants).map(json::mapListOf).orElse(List.of());
    }

    private Product activeProduct(Integer productId) {
        return productRepository.findById(productId)
                .filter(p -> Objects.equals(p.getStatus(), 1))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm."));
    }

    /** Giỏ của người dùng (tạo mới nếu chưa có — firstOrCreate). */
    private Cart cartOf(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUserId(userId);
            return cartRepository.saveAndFlush(cart);
        });
    }

    private CartItem owned(Long userId, Long itemId) {
        CartItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm trong giỏ hàng."));
        Cart cart = cartRepository.findById(item.getCartId()).orElse(null);
        if (cart == null || !Objects.equals(cart.getUserId(), userId)) {
            throw ApiException.notFound("Không tìm thấy sản phẩm trong giỏ hàng.");
        }
        return item;
    }
}
