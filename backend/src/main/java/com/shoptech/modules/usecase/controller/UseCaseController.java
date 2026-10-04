package com.shoptech.modules.usecase.controller;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.util.Numbers;
import com.shoptech.modules.usecase.dto.UseCaseForm;
import com.shoptech.modules.usecase.dto.UseCaseResponse;
import com.shoptech.modules.usecase.service.UseCaseService;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/api")
@RequiredArgsConstructor
public class UseCaseController {

    private final UseCaseService useCaseService;

    @GetMapping("/use-cases")
    public ApiResponse<List<UseCaseResponse>> index(
            @RequestParam(required = false) String categoryId,
            @RequestParam(name = "category_id", required = false) String categoryIdAlt) {
        String raw = categoryId != null ? categoryId : categoryIdAlt;
        if (raw == null || raw.isBlank()) {
            throw ApiException.unprocessable("Thiếu categoryId");
        }
        return ApiResponse.ok(useCaseService.activeByCategory(Numbers.toInt(raw)));
    }

    @GetMapping("/categories/{categoryId}/use-cases")
    public ApiResponse<List<UseCaseResponse>> byCategory(@PathVariable Integer categoryId) {
        return ApiResponse.ok(useCaseService.byCategory(categoryId));
    }

    @PostMapping("/categories/{categoryId}/use-cases")
    @PreAuthorize("@access.module('categories', 'edit')")
    public ResponseEntity<ApiResponse<UseCaseResponse>> create(
            @PathVariable Integer categoryId,
            @ModelAttribute UseCaseForm form,
            @RequestParam(required = false) MultipartFile image) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo Quick Link thành công", useCaseService.create(categoryId, form, image)));
    }

    /** Frontend gửi POST + _method=PUT (HiddenHttpMethodFilter đổi thành PUT). */
    @RequestMapping(value = "/categories/{categoryId}/use-cases/{useCaseId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("@access.module('categories', 'edit')")
    public ApiResponse<UseCaseResponse> update(
            @PathVariable Integer categoryId,
            @PathVariable String useCaseId,
            @ModelAttribute UseCaseForm form,
            @RequestParam(required = false) MultipartFile image) {
        return ApiResponse.ok("Cập nhật Quick Link thành công", useCaseService.update(categoryId, useCaseId, form, image));
    }

    @DeleteMapping("/categories/{categoryId}/use-cases/{useCaseId}")
    @PreAuthorize("@access.module('categories', 'edit')")
    public ApiResponse<Void> delete(@PathVariable Integer categoryId, @PathVariable String useCaseId) {
        useCaseService.delete(categoryId, useCaseId);
        return ApiResponse.message("Xóa Quick Link thành công");
    }
}
