package com.shoptech.modules.brand.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.modules.brand.dto.BrandForm;
import com.shoptech.modules.brand.dto.BrandResponse;
import com.shoptech.modules.brand.service.BrandService;
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
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ApiResponse<List<BrandResponse>> index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<BrandResponse> result = brandService.list(search, sort, page, perPage);
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @GetMapping("/all")
    public ApiResponse<List<BrandResponse>> all() {
        return ApiResponse.ok(brandService.all());
    }

    @GetMapping("/{id}")
    public ApiResponse<BrandResponse> show(@PathVariable Integer id) {
        return ApiResponse.ok("Lấy dữ liệu thành công", brandService.detail(id));
    }

    @PostMapping
    @PreAuthorize("@access.module('brands', 'create')")
    public ResponseEntity<ApiResponse<BrandResponse>> create(
            @ModelAttribute BrandForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        BrandResponse brand = brandService.create(form, images != null ? images : imagesAlt);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Tạo Thương Hiệu Mới thành công", brand));
    }

    /** Frontend gửi PATCH multipart kèm _method=PUT; nhận cả PUT/PATCH cho chắc. */
    @RequestMapping(value = "/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("@access.module('brands', 'edit')")
    public ApiResponse<BrandResponse> update(
            @PathVariable Integer id,
            @ModelAttribute BrandForm form,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        return ApiResponse.ok("Cập nhật thương hiệu thành công",
                brandService.update(id, form, images != null ? images : imagesAlt));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@access.module('brands', 'delete')")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        brandService.delete(id);
        return ApiResponse.message("Xóa thương hiệu thành công");
    }
}
