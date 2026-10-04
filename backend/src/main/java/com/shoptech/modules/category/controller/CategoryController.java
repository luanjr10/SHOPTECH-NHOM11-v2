package com.shoptech.modules.category.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.response.PageMeta;
import com.shoptech.common.util.Numbers;
import com.shoptech.modules.category.dto.CategoryRequest;
import com.shoptech.modules.category.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> index(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(name = "parent_id", required = false) String parentId,
            @RequestParam(name = "with_brands", required = false) String withBrands,
            @RequestParam(name = "with_children", required = false) String withChildren,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        Page<Map<String, Object>> result = categoryService.list(new CategoryService.ListQuery(
                search, sort, parentId, Numbers.toBool(withBrands), Numbers.toBool(withChildren), page, perPage));
        return ApiResponse.page(result.getContent(), PageMeta.of(result));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> show(@PathVariable Integer id) {
        return ApiResponse.ok(categoryService.detail(id));
    }

    @PostMapping
    @PreAuthorize("@access.module('categories', 'create')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thêm Mới Danh Mục Thành Công", categoryService.create(request)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@access.module('categories', 'edit')")
    public ApiResponse<Map<String, Object>> update(@PathVariable Integer id, @RequestBody CategoryRequest request) {
        return ApiResponse.ok("Cập Nhật Danh Mục Thành Công", categoryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@access.module('categories', 'delete')")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        categoryService.delete(id);
        return ApiResponse.message("Xóa Danh Mục Thành Công");
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("@access.module('categories', 'edit')")
    public ApiResponse<Map<String, String>> uploadImage(@PathVariable Integer id,
                                                        @RequestParam(required = false) MultipartFile image) {
        return ApiResponse.ok("Tải ảnh danh mục thành công", Map.of("image", categoryService.uploadImage(id, image)));
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("@access.module('categories', 'edit')")
    public ApiResponse<Void> deleteImage(@PathVariable Integer id) {
        categoryService.deleteImage(id);
        return ApiResponse.message("Đã gỡ ảnh danh mục, quay lại hiển thị bằng icon");
    }
}
