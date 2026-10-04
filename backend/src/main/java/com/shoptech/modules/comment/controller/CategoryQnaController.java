package com.shoptech.modules.comment.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.modules.comment.dto.CommentView;
import com.shoptech.modules.comment.service.CommentService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Hỏi & đáp ở trang danh mục: xem công khai, đặt câu hỏi / trả lời cần đăng nhập. */
@RestController
@RequestMapping("/api/categories/{categoryId}/comments")
@RequiredArgsConstructor
public class CategoryQnaController {

    private final CommentService commentService;

    public record CommentRequest(String body, Long parentId) {
    }

    @GetMapping
    public ApiResponse<List<CommentView>> index(@PathVariable Integer categoryId) {
        return ApiResponse.ok(commentService.categoryThread(categoryId));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentView>> store(@PathVariable Integer categoryId,
                                                          @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã gửi câu hỏi",
                commentService.addCategoryComment(AccessGuard.currentUser().id(), categoryId, request.body(),
                        request.parentId())));
    }
}
