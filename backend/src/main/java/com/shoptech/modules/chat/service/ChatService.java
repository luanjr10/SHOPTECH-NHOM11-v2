package com.shoptech.modules.chat.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.Validator;
import com.shoptech.common.storage.CloudinaryService;
import com.shoptech.common.util.Json;
import com.shoptech.modules.product.document.ProductImage;
import com.shoptech.modules.product.repository.ProductImageRepository;
import com.shoptech.modules.wishlist.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Chat ba phía: khách ↔ gian hàng và khách ↔ đội hỗ trợ ShopTech (hội thoại có store_id rỗng).
 * Client tải lại theo chu kỳ (polling), không dùng websocket. Mỗi bên có bộ đếm tin chưa đọc riêng.
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    public static final int MAX_ATTACHMENTS = 5;
    public static final long MAX_ATTACHMENT_BYTES = 10L * 1024 * 1024;
    public static final Set<String> ATTACHMENT_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx",
            "xls", "xlsx", "txt", "zip");
    public static final String SIDE_CUSTOMER = "customer";
    public static final String SIDE_STORE = "store";

    private final NamedParameterJdbcTemplate jdbc;
    private final CloudinaryService cloudinary;
    private final ProductImageRepository imageRepository;
    private final Json json;

    public static Map<String, Object> supportStore() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", 0);
        m.put("name", "Hỗ trợ ShopTech");
        m.put("slug", "");
        m.put("logo", null);
        m.put("is_support", true);
        return m;
    }

    // ------------------------------------------------------------------ mở hội thoại

    @Transactional
    public Map<String, Object> startConversation(Long customerId, Long storeId) {
        Map<String, Object> store = jdbc.queryForList("""
                        SELECT s.id, s.name, s.slug, s.logo, s.status, sp.user_id AS owner_id FROM stores s
                        LEFT JOIN seller_profiles sp ON sp.id = s.seller_profile_id WHERE s.id = :id
                        """, new MapSqlParameterSource("id", storeId)).stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy gian hàng"));
        if (!"active".equals(store.get("status"))) {
            throw ApiException.unprocessable("Gian hàng này hiện không hoạt động.");
        }
        if (store.get("owner_id") != null && ((Number) store.get("owner_id")).longValue() == customerId) {
            throw ApiException.unprocessable("Bạn không thể nhắn tin cho gian hàng của chính mình.");
        }
        long conversationId = firstOrCreate(customerId, storeId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", conversationId);
        out.put("user_id", customerId);
        out.put("store_id", storeId);
        out.put("store", storeRef(((Number) store.get("id")).longValue(), (String) store.get("name"),
                (String) store.get("slug"), (String) store.get("logo")));
        return out;
    }

    /** Hội thoại hỗ trợ: khách chat với đội ngũ ShopTech, admin/nhân viên trả lời. */
    @Transactional
    public Map<String, Object> startSupportConversation(Long customerId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", firstOrCreate(customerId, null));
        out.put("store", supportStore());
        return out;
    }

    private long firstOrCreate(Long customerId, Long storeId) {
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("u", customerId).addValue("s", storeId);
        List<Long> found = jdbc.queryForList("SELECT id FROM chat_conversations WHERE user_id = :u AND "
                + (storeId == null ? "store_id IS NULL" : "store_id = :s"), p, Long.class);
        if (!found.isEmpty()) {
            return found.get(0);
        }
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO chat_conversations (user_id, store_id, customer_unread, store_unread, created_at, updated_at)
                VALUES (:u, :s, 0, 0, :now, :now)
                """, p.addValue("now", now));
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", new MapSqlParameterSource(), Long.class);
    }

    // ------------------------------------------------------------------ danh sách / tin nhắn

    @Transactional(readOnly = true)
    public List<Map<String, Object>> conversationsOfCustomer(Long customerId) {
        return jdbc.query("""
                SELECT c.id, c.last_message_preview, c.last_message_at, c.customer_unread,
                       s.id AS store_id, s.name AS store_name, s.slug AS store_slug, s.logo AS store_logo
                FROM chat_conversations c LEFT JOIN stores s ON s.id = c.store_id
                WHERE c.user_id = :u AND c.last_message_at IS NOT NULL ORDER BY c.last_message_at DESC
                """, new MapSqlParameterSource("u", customerId), (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("store", rs.getObject("store_id") == null ? supportStore() : storeRef(rs.getLong("store_id"),
                    rs.getString("store_name"), rs.getString("store_slug"), rs.getString("store_logo")));
            row.put("last_message_preview", rs.getString("last_message_preview"));
            row.put("last_message_at", iso(rs.getTimestamp("last_message_at")));
            row.put("unread", rs.getInt("customer_unread"));
            return row;
        });
    }

    /** Hộp thư của gian hàng (storeId) hoặc của đội hỗ trợ (storeId = null). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> conversationsOfStore(Long storeId) {
        return jdbc.query("""
                SELECT c.id, c.last_message_preview, c.last_message_at, c.store_unread,
                       u.id AS customer_id, u.name AS customer_name, u.username AS customer_username
                FROM chat_conversations c JOIN users u ON u.id = c.user_id
                WHERE c.last_message_at IS NOT NULL
                """ + (storeId == null ? " AND c.store_id IS NULL" : " AND c.store_id = :s")
                + " ORDER BY c.last_message_at DESC", new MapSqlParameterSource("s", storeId), (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("customer", customerRef(rs.getLong("customer_id"), rs.getString("customer_name"), rs.getString("customer_username")));
            row.put("last_message_preview", rs.getString("last_message_preview"));
            row.put("last_message_at", iso(rs.getTimestamp("last_message_at")));
            row.put("unread", rs.getInt("store_unread"));
            return row;
        });
    }

    @Transactional(readOnly = true)
    public int unreadForStore(Long storeId) {
        Integer n = jdbc.queryForObject("SELECT COALESCE(SUM(store_unread), 0) FROM chat_conversations WHERE "
                + (storeId == null ? "store_id IS NULL" : "store_id = :s"), new MapSqlParameterSource("s", storeId), Integer.class);
        return n == null ? 0 : n;
    }

    @Transactional(readOnly = true)
    public int unreadForCustomer(Long customerId) {
        Integer n = jdbc.queryForObject("SELECT COALESCE(SUM(customer_unread), 0) FROM chat_conversations WHERE user_id = :u",
                new MapSqlParameterSource("u", customerId), Integer.class);
        return n == null ? 0 : n;
    }

    /** Hội thoại phải thuộc đúng khách / gian hàng / đội hỗ trợ; không thì coi như không tồn tại. */
    @Transactional(readOnly = true)
    public Map<String, Object> conversation(Long id) {
        return jdbc.queryForList("SELECT * FROM chat_conversations WHERE id = :id", new MapSqlParameterSource("id", id))
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Không tìm thấy cuộc trò chuyện"));
    }

    public Map<String, Object> ownedByCustomer(Long id, Long customerId) {
        Map<String, Object> c = conversation(id);
        if (((Number) c.get("user_id")).longValue() != customerId) {
            throw ApiException.notFound("Không tìm thấy cuộc trò chuyện");
        }
        return c;
    }

    public Map<String, Object> ownedByStore(Long id, Long storeId) {
        Map<String, Object> c = conversation(id);
        if (storeId == null ? c.get("store_id") != null : c.get("store_id") == null || ((Number) c.get("store_id")).longValue() != storeId) {
            throw ApiException.notFound("Không tìm thấy cuộc trò chuyện");
        }
        return c;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> storeOfConversation(Map<String, Object> conversation) {
        if (conversation.get("store_id") == null) {
            return supportStore();
        }
        return jdbc.queryForList("SELECT id, name, slug, logo FROM stores WHERE id = :id",
                new MapSqlParameterSource("id", conversation.get("store_id"))).stream().findFirst()
                .map(s -> storeRef(((Number) s.get("id")).longValue(), (String) s.get("name"), (String) s.get("slug"), (String) s.get("logo")))
                .orElse(supportStore());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> customerOfConversation(Map<String, Object> conversation) {
        return jdbc.queryForList("SELECT id, name, username FROM users WHERE id = :id",
                new MapSqlParameterSource("id", conversation.get("user_id"))).stream().findFirst()
                .map(u -> customerRef(((Number) u.get("id")).longValue(), (String) u.get("name"), (String) u.get("username")))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> messages(Long conversationId, long afterId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT * FROM chat_messages WHERE conversation_id = :c AND id > :after ORDER BY id LIMIT 100
                """, new MapSqlParameterSource().addValue("c", conversationId).addValue("after", afterId));
        return present(rows);
    }

    // ------------------------------------------------------------------ gửi / đọc

    /** Tải tệp đính kèm lên Cloudinary (ảnh vào thư mục chat, tệp khác dạng raw). */
    public List<Map<String, Object>> uploadAttachments(List<MultipartFile> files) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (MultipartFile f : files.subList(0, Math.min(files.size(), MAX_ATTACHMENTS))) {
            boolean image = f.getContentType() != null && f.getContentType().toLowerCase(Locale.ROOT).startsWith("image/");
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", image ? "image" : "file");
            try {
                m.put("url", image ? cloudinary.uploadImage(f, "chat-shoptech") : cloudinary.uploadFile(f, "chat-shoptech"));
            } catch (IllegalStateException e) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, e.getMessage());
            }
            m.put("name", f.getOriginalFilename());
            m.put("size", f.getSize());
            out.add(m);
        }
        return out;
    }

    /** Kiểm tra số lượng, dung lượng và định dạng tệp đính kèm. */
    public void validateAttachments(Validator v, List<MultipartFile> files) {
        v.check(files.size() <= MAX_ATTACHMENTS, "attachments", "Tối đa " + MAX_ATTACHMENTS + " tệp đính kèm.");
        for (int i = 0; i < files.size(); i++) {
            MultipartFile f = files.get(i);
            String name = f.getOriginalFilename() == null ? "" : f.getOriginalFilename();
            String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
            v.check(ATTACHMENT_EXT.contains(ext), "attachments." + i, "Định dạng tệp không được hỗ trợ.");
            v.check(f.getSize() <= MAX_ATTACHMENT_BYTES, "attachments." + i, "Mỗi tệp tối đa 10MB.");
        }
    }

    @Transactional
    public Map<String, Object> send(Long conversationId, String side, Long senderId, String body, Integer productId,
                                    List<Map<String, Object>> attachments) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty() && attachments.isEmpty()) {
            throw ApiException.unprocessable("Tin nhắn không được để trống.");
        }
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("""
                INSERT INTO chat_messages (conversation_id, sender_type, sender_id, body, product_id, attachments, created_at, updated_at)
                VALUES (:c, :side, :sender, :body, :p, :att, :now, :now)
                """, new MapSqlParameterSource().addValue("c", conversationId).addValue("side", side)
                .addValue("sender", senderId).addValue("body", text).addValue("p", productId)
                .addValue("att", attachments.isEmpty() ? null : json.write(attachments)).addValue("now", now));
        Long messageId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", new MapSqlParameterSource(), Long.class);

        String unreadColumn = SIDE_CUSTOMER.equals(side) ? "store_unread" : "customer_unread";
        String preview = text.isEmpty() ? attachmentPreview(attachments) : text;
        if (preview.length() > 80) {
            preview = preview.substring(0, 77) + "...";
        }
        jdbc.update("UPDATE chat_conversations SET last_message_at = :now, last_message_preview = :pv, " + unreadColumn
                        + " = " + unreadColumn + " + 1, updated_at = :now WHERE id = :id",
                new MapSqlParameterSource().addValue("now", now).addValue("pv", preview).addValue("id", conversationId));

        return present(jdbc.queryForList("SELECT * FROM chat_messages WHERE id = :id", new MapSqlParameterSource("id", messageId))).get(0);
    }

    @Transactional
    public void markRead(Long conversationId, String side) {
        String column = SIDE_CUSTOMER.equals(side) ? "customer_unread" : "store_unread";
        jdbc.update("UPDATE chat_conversations SET " + column + " = 0 WHERE id = :id AND " + column + " > 0",
                new MapSqlParameterSource("id", conversationId));
    }

    // ------------------------------------------------------------------ helpers

    private List<Map<String, Object>> present(List<Map<String, Object>> rows) {
        List<Integer> productIds = rows.stream().map(r -> r.get("product_id")).filter(p -> p != null)
                .map(p -> ((Number) p).intValue()).distinct().toList();
        Map<Integer, Map<String, Object>> products = new HashMap<>();
        Map<Integer, String> thumbnails = new HashMap<>();
        if (!productIds.isEmpty()) {
            jdbc.queryForList("SELECT id, name, slug, price, discount_percent FROM products WHERE id IN (:ids)",
                    new MapSqlParameterSource("ids", productIds)).forEach(p -> products.put(((Number) p.get("id")).intValue(), p));
            for (ProductImage pi : imageRepository.findByProductIdIn(productIds)) {
                if (pi.getImages() != null && !pi.getImages().isEmpty()) {
                    thumbnails.putIfAbsent(pi.getProductId(), pi.getImages().get(0));
                }
            }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.get("id"));
            m.put("sender_type", r.get("sender_type"));
            m.put("body", r.get("body"));
            m.put("attachments", r.get("attachments") == null ? List.of() : json.mapListOf(r.get("attachments").toString()));
            m.put("created_at", iso((Timestamp) r.get("created_at")));
            Map<String, Object> product = r.get("product_id") == null ? null : products.get(((Number) r.get("product_id")).intValue());
            if (product == null) {
                m.put("product", null);
            } else {
                int discount = product.get("discount_percent") == null ? 0 : ((Number) product.get("discount_percent")).intValue();
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("id", product.get("id"));
                p.put("name", product.get("name"));
                p.put("slug", product.get("slug"));
                p.put("final_price", WishlistService.effectivePrice((BigDecimal) product.get("price"), discount));
                p.put("thumbnail", thumbnails.get(((Number) product.get("id")).intValue()));
                m.put("product", p);
            }
            out.add(m);
        }
        return out;
    }

    private static String attachmentPreview(List<Map<String, Object>> attachments) {
        boolean allImages = attachments.stream().allMatch(a -> "image".equals(a.get("type")));
        return allImages ? "[Đã gửi " + attachments.size() + " ảnh]" : "[Đã gửi tệp đính kèm]";
    }

    private static Map<String, Object> storeRef(long id, String name, String slug, String logo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("slug", slug);
        m.put("logo", logo);
        return m;
    }

    private static Map<String, Object> customerRef(long id, String name, String username) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("username", username);
        return m;
    }

    private static String iso(Timestamp ts) {
        return ts == null ? null : ts.toInstant().toString();
    }
}
