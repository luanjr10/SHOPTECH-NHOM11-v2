package com.shoptech.modules.installment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi ngày 08:00 (giờ Việt Nam): nhắc kỳ trả góp sắp đến hạn trong 3 ngày và kỳ đã quá hạn. */
@Slf4j
@Component
@RequiredArgsConstructor
public class InstallmentReminderJob {

    private static final int DAYS_BEFORE_DUE = 3;

    private final InstallmentService installmentService;

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void remind() {
        int sent = installmentService.sendReminders(DAYS_BEFORE_DUE);
        log.info("Đã gửi {} email nhắc trả góp.", sent);
    }
}
