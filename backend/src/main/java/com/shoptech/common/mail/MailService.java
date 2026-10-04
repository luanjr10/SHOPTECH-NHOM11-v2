package com.shoptech.common.mail;

import com.shoptech.config.AppProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.UnsupportedEncodingException;
import java.util.Locale;
import java.util.Map;

/** Gửi email HTML dựng từ template Thymeleaf trong resources/templates/mail. */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final AppProperties props;

    public void send(String to, String subject, String template, Map<String, Object> variables) {
        try {
            Context ctx = new Context(Locale.forLanguageTag("vi"));
            ctx.setVariables(variables);
            ctx.setVariable("subject", subject);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(props.mail().fromAddress(), props.mail().fromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(templateEngine.process("mail/" + template, ctx), true);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            throw new IllegalStateException("Gửi email thất bại", e);
        }
    }

    /** Gửi nhưng không làm hỏng luồng chính nếu SMTP lỗi (vd. đăng ký vẫn thành công). */
    public void sendQuietly(String to, String subject, String template, Map<String, Object> variables) {
        try {
            send(to, subject, template, variables);
        } catch (RuntimeException e) {
            log.warn("Không gửi được email '{}' tới {}: {}", subject, to, e.getMessage());
        }
    }
}
