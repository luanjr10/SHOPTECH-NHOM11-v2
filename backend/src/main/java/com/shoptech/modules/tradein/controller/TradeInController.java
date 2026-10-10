package com.shoptech.modules.tradein.controller;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.ValidationException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.response.ApiResponse;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.storage.ImageRules;
import com.shoptech.common.util.Numbers;
import com.shoptech.modules.tradein.service.TradeInService;
import com.shoptech.security.AccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Thu cũ đổi mới phía khách: xem bảng giá các gian hàng, báo giá thử và gửi yêu cầu kèm ảnh. */
@RestController
@RequestMapping("/api/trade-in")
@RequiredArgsConstructor
public class TradeInController {

    private static final String UPLOAD_FOLDER = "tradein-shoptech";

    private final TradeInService tradeInService;
    private final CloudinaryService cloudinary;

    public record EstimateRequest(Long tradeInModelId, String condition, Boolean hasBox, Boolean hasCharger) {
    }

    @GetMapping("/catalog")
    public ApiResponse<Map<String, Object>> catalog() {
        return ApiResponse.ok(tradeInService.catalog());
    }

    @PostMapping("/estimate")
    public ApiResponse<Map<String, Object>> estimate(@RequestBody EstimateRequest request) {
        Validator v = new Validator();
        v.check(request.tradeInModelId() != null, "trade_in_model_id", "Vui lòng chọn dòng máy");
        v.check(request.condition() != null && !request.condition().isBlank(), "condition", "Vui lòng chọn tình trạng máy");
        v.throwIfFailed();
        return ApiResponse.ok(tradeInService.estimate(request.tradeInModelId(), request.condition(),
                Boolean.TRUE.equals(request.hasBox()), Boolean.TRUE.equals(request.hasCharger())));
    }

    @GetMapping("/requests")
    public ApiResponse<List<Map<String, Object>>> mine() {
        return ApiResponse.ok(tradeInService.mine(AccessGuard.currentUser().id()));
    }

    @PostMapping(value = "/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> submit(
            @RequestParam(name = "store_id", required = false) Long storeId,
            @RequestParam(name = "trade_in_model_id", required = false) Long modelId,
            @RequestParam(required = false) String condition,
            @RequestParam(name = "has_box", required = false) String hasBox,
            @RequestParam(name = "has_charger", required = false) String hasCharger,
            @RequestParam(required = false) String description,
            @RequestParam(name = "images[]", required = false) List<MultipartFile> images,
            @RequestParam(name = "images", required = false) List<MultipartFile> imagesAlt) {
        List<MultipartFile> files = ImageRules.nonEmpty(images != null ? images : imagesAlt);

        Validator v = new Validator();
        v.check(storeId != null, "store_id", "Vui lòng chọn gian hàng");
        v.check(modelId != null, "trade_in_model_id", "Vui lòng chọn dòng máy");
        v.check(condition != null && TradeInService.CONDITIONS.stream().anyMatch(c -> c.key().equals(condition)),
                "condition", "Vui lòng chọn tình trạng máy");
        v.check(description == null || description.length() <= 1000, "description", "Mô tả không được vượt quá 1000 ký tự");
        v.check(!files.isEmpty(), "images", "Vui lòng tải lên ít nhất 1 ảnh thực tế của máy.");
        v.check(files.size() <= 4, "images", "Tối đa 4 ảnh.");
        ImageRules.check(v, files, "images", true, Set.of("jpg", "jpeg", "png", "webp"),
                "Tệp tải lên phải là ảnh.", "Ảnh phải có định dạng jpg, jpeg, png hoặc webp.", "Mỗi ảnh tối đa 5MB.");
        v.throwIfFailed();

        List<String> urls;
        try {
            urls = files.stream().map(f -> cloudinary.uploadImage(f, UPLOAD_FOLDER)).toList();
        } catch (IllegalStateException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
        Map<String, Object> created = tradeInService.submit(AccessGuard.currentUser().id(),
                new TradeInService.SubmitData(storeId, modelId, condition, Numbers.toBool(hasBox),
                        Numbers.toBool(hasCharger), description == null || description.isBlank() ? null : description.trim()), urls);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                "Đã gửi yêu cầu thu cũ. Gian hàng sẽ xem ảnh, duyệt và gửi voucher cho bạn.", created));
    }
}
