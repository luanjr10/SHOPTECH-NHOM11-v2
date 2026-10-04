package com.shoptech.modules.comment.controller;

import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.util.Numbers;
import com.shoptech.modules.comment.dto.CommentView;
import com.shoptech.modules.comment.service.CommentService;
import com.shoptech.modules.review.dto.ProductReviewPage;
import com.shoptech.modules.review.service.ProductReviewService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Trang chi tiết sản phẩm: đánh giá (sao + ảnh) và bình luận / hỏi đáp.
 * Xem thì công khai; gửi đánh giá / bình luận cần đăng nhập.
 */
@RestController
@RequestMapping("/api/products/{productId}")
@RequiredArgsConstructor
public class ProductFeedbackController {

    private final ProductReviewService reviewService;
    private final CommentService commentService;

    public record CommentRequest(String body, Long parentId) {
    }

    @GetMapping("/reviews")
    public ApiResponse<ProductReviewPage> reviews(
            @PathVariable Integer productId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String verified,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "per_page", required = false) Integer perPage) {
        return ApiResponse.ok(reviewService.list(productId, rating, Numbers.toBool(verified), page, perPage));
    }

    /** multipart: rating (1–5), comment, images[] (tối đa 5 ảnh). Gửi lại thì cập nhật đánh giá cũ. */
    @PostMapping("/reviews")
    public ResponseEntity<ApiResponse<ProductReviewPage.Item>> review(
            @PathVariable Integer productId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String comment,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        ProductReviewService.Submitted result = reviewService.submit(AccessGuard.currentUser().id(), productId, rating,
                comment, images != null ? images : imagesAlt);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(ApiResponse.ok(
                result.created() ? "Đã gửi đánh giá — cảm ơn bạn!" : "Đã cập nhật đánh giá của bạn", result.review()));
    }

    @GetMapping("/comments")
    public ApiResponse<List<CommentView>> comments(@PathVariable Integer productId) {
        return ApiResponse.ok(commentService.productThread(productId));
    }

    @PostMapping("/comments")
    public ResponseEntity<ApiResponse<CommentView>> comment(@PathVariable Integer productId,
                                                            @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã gửi bình luận",
                commentService.addProductComment(AccessGuard.currentUser().id(), productId, request.body(),
                        request.parentId())));
    }
}
