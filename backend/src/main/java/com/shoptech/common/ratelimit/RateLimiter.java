package com.shoptech.common.ratelimit;

import com.shoptech.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số lần gọi theo cửa sổ trượt 1 phút cho các endpoint nhạy cảm
 * (quên mật khẩu, nhập mã, gửi lại email...). Lưu trong bộ nhớ — đủ cho một instance.
 */
@Component
public class RateLimiter {

    private static final long WINDOW_MILLIS = 60_000;

    private final ConcurrentHashMap<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public void check(String key, int maxPerMinute) {
        long now = System.currentTimeMillis();
        Deque<Long> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MILLIS) {
                times.pollFirst();
            }
            if (times.size() >= maxPerMinute) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút");
            }
            times.addLast(now);
        }
        if (hits.size() > 10_000) {
            hits.entrySet().removeIf(e -> e.getValue().isEmpty());
        }
    }
}
