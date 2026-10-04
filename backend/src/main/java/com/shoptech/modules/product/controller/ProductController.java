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

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /** Danh sách + lọc; nhận cả tên tham số snake_case lẫn camelCase. */
    @GetMapping
    public ApiResponse<List<ProductResponse>> index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(name = "category_id", required = false) String categoryId,
            @RequestParam(name = "categoryId", required = false) String categoryIdAlt,
            @RequestParam(name = "brand_id", required = false) String brandId,
            @RequestParam(name = "store_id", required = false) String storeId,
            @RequestParam(name = "storeId", required = false) String storeIdAlt,
            @RequestParam(name = "province_id", required = false) String provinceId,
            @RequestParam(name = "useCase", required = false) String useCase,
            @RequestParam(name = "use_case", required = false) String useCaseAlt,
            @RequestParam(name = "useCaseId", required = false) String useCaseId,
            @RequestParam(name = "use_case_id", required = false) String useCaseIdAlt,
            @RequestParam(name = "is_featured", required = false) String isFeatured,
            @RequestParam(name = "is_flash_sale", required = false) String isFlashSale,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<ProductResponse> result = productService.list(new ProductService.ListQuery(
                search, sort,
                categoryId != null ? categoryId : categoryIdAlt,
                brandId,
                storeId != null ? storeId : storeIdAlt,
                provinceId,
                useCase != null ? useCase : useCaseAlt,
                useCaseId != null ? useCaseId : useCaseIdAlt,
                isFeatured, isFlashSale, page, perPage));
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @GetMapping("/{idOrSlug}")
    public ApiResponse<ProductDetailResponse> show(@PathVariable String idOrSlug) {
        return ApiResponse.ok("Lấy dữ liệu thành công", productService.detail(idOrSlug));
    }

    @PostMapping
    @PreAuthorize("@access.module('products', 'create')")
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @ModelAttribute ProductForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        ProductResponse product = productService.create(form, images != null ? images : imagesAlt);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Tạo sản phẩm thành công", product));
    }

    /** Frontend gửi POST multipart + _method=PUT (HiddenHttpMethodFilter đổi thành PUT). */
    @RequestMapping(value = "/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("@access.module('products', 'edit')")
    public ApiResponse<ProductDetailResponse> update(
            @PathVariable Integer id,
            @ModelAttribute ProductForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        return ApiResponse.ok("Cập nhật sản phẩm thành công",
                productService.update(id, form, images != null ? images : imagesAlt));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@access.module('products', 'delete')")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        productService.delete(id);
        return ApiResponse.message("Xóa sản phẩm thành công");
    }
}
