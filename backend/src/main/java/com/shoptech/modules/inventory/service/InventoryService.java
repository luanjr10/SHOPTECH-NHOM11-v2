package com.shoptech.modules.inventory.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.Pagination;
import com.shoptech.modules.inventory.dto.InventoryItem;
import com.shoptech.modules.inventory.dto.StockAdjustRequest;
import com.shoptech.modules.inventory.entity.StockAdjustment;
import com.shoptech.modules.inventory.repository.StockAdjustmentRepository;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.store.entity.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/** Kho hàng của gian hàng: xem tồn kho (ưu tiên sắp hết) và điều chỉnh có ghi nhật ký. */
@Service
@RequiredArgsConstructor
public class InventoryService {

    public static final int LOW_STOCK_THRESHOLD = 10;
    private static final int PER_PAGE = 15;

    private final ProductRepository productRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final RequestValidator requestValidator;

    @Transactional(readOnly = true)
    public Page<InventoryItem> list(Store store, boolean lowStockOnly, Integer page, Integer perPage) {
        Pageable pageable = Pagination.of(page, perPage, PER_PAGE, Sort.by("stock").ascending().and(Sort.by("id")));
        Page<Product> products = lowStockOnly
                ? productRepository.findByStoreIdAndStockLessThanEqual(store.getId(), LOW_STOCK_THRESHOLD, pageable)
                : productRepository.findByStoreId(store.getId(), pageable);
        return products.map(p -> InventoryItem.of(p, LOW_STOCK_THRESHOLD));
    }

    @Transactional
    public StockAdjustment adjust(Store store, Integer productId, Long sellerProfileId, StockAdjustRequest request) {
        Validator v = requestValidator.validate(request);
        if (!v.has("change")) {
            v.check(request.change() != 0, "change", "Số lượng thay đổi phải khác 0");
        }
        v.throwIfFailed();

        // Khoá dòng sản phẩm để hai lần điều chỉnh đồng thời không ghi đè tồn kho của nhau.
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        ensureInStore(store, product);

        int previous = product.getStock() == null ? 0 : product.getStock();
        int next = previous + request.change();
        if (next < 0) {
            throw ApiException.unprocessable("Số lượng tồn kho không thể âm");
        }

        product.setStock(next);
        productRepository.save(product);

        StockAdjustment adjustment = new StockAdjustment();
        adjustment.setStoreId(store.getId());
        adjustment.setProductId(product.getId());
        adjustment.setSellerProfileId(sellerProfileId);
        adjustment.setPreviousStock(previous);
        adjustment.setChange(request.change());
        adjustment.setNewStock(next);
        adjustment.setReason(request.reason() == null || request.reason().isBlank() ? null : request.reason().trim());
        return adjustmentRepository.save(adjustment);
    }

    @Transactional(readOnly = true)
    public List<StockAdjustment> history(Store store, Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        ensureInStore(store, product);
        return adjustmentRepository.findByProductIdOrderByCreatedAtDescIdDesc(productId);
    }

    private static void ensureInStore(Store store, Product product) {
        if (!Objects.equals(store.getId(), product.getStoreId())) {
            throw ApiException.notFound("Sản phẩm không thuộc gian hàng này");
        }
    }
}
