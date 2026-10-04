package com.shoptech.modules.inventory.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.util.Json;
import com.shoptech.modules.product.document.ProductSpecification;
import com.shoptech.modules.product.entity.Product;
import com.shoptech.modules.product.repository.ProductRepository;
import com.shoptech.modules.product.repository.ProductSpecificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Trừ / hoàn tồn kho khi bàn giao hoặc huỷ đơn. Có SKU khớp biến thể (Mongo product_specifications.variants)
 * thì cập nhật tồn kho của biến thể, không thì cập nhật products.stock.
 */
@Service
@RequiredArgsConstructor
public class StockService {

    private final ProductRepository productRepository;
    private final ProductSpecificationRepository specificationRepository;
    private final Json json;

    @Transactional(propagation = Propagation.MANDATORY)
    public void decrement(Integer productId, String sku, int quantity, String productName) {
        if (sku != null && !sku.isBlank()) {
            ProductSpecification spec = specificationRepository.findFirstByProductId(productId).orElse(null);
            List<Map<String, Object>> variants = spec == null ? List.of() : json.mapListOf(spec.getVariants());
            boolean matched = false;
            for (Map<String, Object> variant : variants) {
                if (Objects.equals(sku, variant.get("sku"))) {
                    int current = intOf(variant.get("stock"));
                    if (current < quantity) {
                        throw notEnough(productName, current);
                    }
                    variant.put("stock", current - quantity);
                    matched = true;
                }
            }
            if (matched) {
                saveVariants(spec, variants);
                return;
            }
        }

        Product product = productRepository.findByIdForUpdate(productId).orElse(null);
        int available = product == null || product.getStock() == null ? 0 : product.getStock();
        if (product == null || available < quantity) {
            throw notEnough(productName, available);
        }
        product.setStock(available - quantity);
        productRepository.save(product);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void restore(Integer productId, String sku, int quantity) {
        if (sku != null && !sku.isBlank()) {
            ProductSpecification spec = specificationRepository.findFirstByProductId(productId).orElse(null);
            List<Map<String, Object>> variants = spec == null ? List.of() : json.mapListOf(spec.getVariants());
            boolean matched = false;
            for (Map<String, Object> variant : variants) {
                if (Objects.equals(sku, variant.get("sku"))) {
                    variant.put("stock", intOf(variant.get("stock")) + quantity);
                    matched = true;
                }
            }
            if (matched) {
                saveVariants(spec, variants);
                return;
            }
        }

        productRepository.findByIdForUpdate(productId).ifPresent(product -> {
            product.setStock((product.getStock() == null ? 0 : product.getStock()) + quantity);
            productRepository.save(product);
        });
    }

    /** Ghi lại dạng chuỗi JSON như ProductService (dữ liệu cũ lưu kiểu này). */
    private void saveVariants(ProductSpecification spec, List<Map<String, Object>> variants) {
        spec.setVariants(json.write(variants));
        spec.setUpdatedAt(Instant.now());
        specificationRepository.save(spec);
    }

    private static int intOf(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return value == null ? 0 : Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static ApiException notEnough(String productName, int available) {
        return ApiException.unprocessable(
                "Sản phẩm \"" + productName + "\" không đủ tồn kho để bàn giao (còn " + available + ").");
    }
}
