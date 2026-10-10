package com.shoptech.security;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Danh sách module phân quyền cho nhân viên — giữ nguyên key/label như App\Support\AdminModules. */
public final class AdminModules {

    public record Module(String key, String label, List<String> abilities) {
    }

    private static final List<String> CRUD = List.of("view", "create", "edit", "delete");

    public static final List<Module> MODULES = List.of(
            new Module("products", "Sản phẩm", CRUD),
            new Module("categories", "Danh mục", CRUD),
            new Module("brands", "Thương hiệu", CRUD),
            new Module("customers", "Khách hàng", List.of("view")),
            new Module("seller_applications", "Người bán", List.of("view", "edit")),
            new Module("stores", "Gian hàng", List.of("view", "edit")),
            new Module("orders", "Đơn hàng & Hóa đơn", List.of("view", "edit")),
            new Module("reviews", "Đánh giá & Theo dõi", List.of("view", "delete")),
            new Module("commissions", "Hoa hồng", List.of("view", "create", "delete")),
            new Module("withdrawals", "Rút tiền", List.of("view", "edit")),
            new Module("platform_funds", "Quỹ sàn", List.of("view")),
            new Module("home_highlights", "Nổi bật trang chủ", List.of("view", "edit")),
            new Module("support_chat", "Hỗ trợ khách (chat)", List.of("view", "edit"))
    );

    private static final Map<String, Module> BY_KEY = new LinkedHashMap<>();

    static {
        MODULES.forEach(m -> BY_KEY.put(m.key(), m));
    }

    private AdminModules() {
    }

    public static List<String> keys() {
        return new ArrayList<>(BY_KEY.keySet());
    }

    public static boolean isValidModule(String module) {
        return BY_KEY.containsKey(module);
    }

    public static boolean isValidAbility(String module, String ability) {
        Module m = BY_KEY.get(module);
        return m != null && m.abilities().contains(ability);
    }
}
