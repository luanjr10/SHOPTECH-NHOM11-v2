package com.shoptech.modules.product.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.modules.product.dto.ProductDetailResponse;
import com.shoptech.modules.product.dto.ProductForm;
import com.shoptech.modules.product.dto.ProductResponse;
import com.shoptech.modules.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Seller Center — sản phẩm của một gian hàng (dùng chung ProductService với admin, ép theo store_id). */
@RestController
@RequestMapping("/api/seller/stores/{storeId}/products")
@RequiredArgsConstructor
public class SellerProductController {

    private static final int PER_PAGE = 15;

    private final ProductService productService;

    @GetMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<List<ProductResponse>> index(
            @PathVariable Long storeId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<ProductResponse> result = productService.list(new ProductService.ListQuery(
                search, sort, null, null, String.valueOf(storeId), null, null, null, null, null,
                page, perPage == null ? PER_PAGE : perPage));
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @PostMapping
    @PreAuthorize("@seller.owns(#storeId)")
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @PathVariable Long storeId,
            @ModelAttribute ProductForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        ProductResponse product = productService.create(form, images != null ? images : imagesAlt, storeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Tạo sản phẩm thành công", product));
    }

    /** Frontend gửi POST multipart (có hoặc không kèm _method=PUT). */
    @RequestMapping(value = "/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<ProductDetailResponse> update(
            @PathVariable Long storeId,
            @PathVariable Integer id,
            @ModelAttribute ProductForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        return ApiResponse.ok("Cập nhật sản phẩm thành công",
                productService.update(id, form, images != null ? images : imagesAlt, storeId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@seller.owns(#storeId)")
    public ApiResponse<Void> delete(@PathVariable Long storeId, @PathVariable Integer id) {
        productService.delete(id, storeId);
        return ApiResponse.message("Xóa sản phẩm thành công");
    }
}
