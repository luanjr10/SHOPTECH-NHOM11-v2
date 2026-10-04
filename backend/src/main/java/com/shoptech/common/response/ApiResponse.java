package com.shoptech.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * Định dạng response chung của API: { success, message?, data?, meta?, errors? }.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        Object meta,
        Map<String, List<String>> errors
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, data, null, null);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null, null);
    }

    /** meta thường là PageMeta; một số màn hình trả thêm trường riêng (vd low_stock_threshold). */
    public static <T> ApiResponse<T> page(T data, Object meta) {
        return new ApiResponse<>(true, null, data, meta, null);
    }

    public static ApiResponse<Void> message(String message) {
        return new ApiResponse<>(true, message, null, null, null);
    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(false, message, null, null, null);
    }

    public static ApiResponse<Void> fail(String message, Map<String, List<String>> errors) {
        return new ApiResponse<>(false, message, null, null, errors);
    }
}
