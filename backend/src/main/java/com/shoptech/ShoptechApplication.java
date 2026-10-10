package com.shoptech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

import java.util.TimeZone;

// Xác thực bằng JWT tự viết → không cần user in-memory mặc định của Spring Security.
@EnableScheduling
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class ShoptechApplication {

    public static void main(String[] args) {
        // Timestamp trong database lưu theo UTC; giữ cùng múi giờ để mốc thời gian
        // và việc nhóm theo ngày/tháng trên dashboard luôn chính xác.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(ShoptechApplication.class, args);
    }
}
