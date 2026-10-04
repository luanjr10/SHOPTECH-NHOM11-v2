package com.shoptech.security;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // API stateless dùng JWT (cookie SameSite=Lax + CORS có danh sách origin) → không cần CSRF token.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {
                })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAuthenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/login", "/api/register", "/api/refresh",
                                "/api/forgot-password", "/api/verify-reset-code", "/api/reset-password").permitAll()
                        // Phí ship ở bước thanh toán, chatbot AI, IPN của MoMo (kiểm chữ ký trong service)
                        .requestMatchers(HttpMethod.POST, "/api/shipping/fee", "/api/ai/chat",
                                "/api/payments/momo/notify", "/api/payments/sepay/webhook").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/google", "/api/auth/google/callback",
                                "/api/email/verify/**").permitAll()
                        // Cổng thanh toán chuyển hướng về (kiểm tra chữ ký / quyền bên trong controller)
                        .requestMatchers(HttpMethod.GET, "/api/payments/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/products", "/api/products/**",
                                "/api/categories", "/api/categories/**",
                                "/api/brands", "/api/brands/**",
                                "/api/use-cases",
                                "/api/locations/**",
                                "/api/stores", "/api/stores/**",
                                "/api/settings/flash-sale").permitAll()
                        // Phân quyền chi tiết (role + module permission) nằm ở @PreAuthorize trên controller.
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** Filter JWT chỉ chạy trong security chain, không để Boot đăng ký thêm lần nữa như servlet filter. */
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /** BCrypt (đọc được cả hash tiền tố "$2y$" có sẵn trong database). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
