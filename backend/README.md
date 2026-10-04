# ShopTech Backend

REST API cho trang quản trị ShopTech — **Modular Monolith + Layered Architecture + Spring MVC**.

## Công nghệ

Java 21+ · Spring Boot 3.5 · Spring MVC · Spring Data JPA (MySQL) · Spring Data MongoDB ·
Spring Security + JWT (jjwt) · Bean Validation · Lombok · Cloudinary · Maven

## Cấu trúc

```
com.shoptech
├── common        # ApiResponse, phân trang, GlobalExceptionHandler, validator, Cloudinary, util
├── config        # AppProperties, CORS, cấu hình repository JPA/Mongo
├── security      # JWT filter (header hoặc cookie access_token), AccessGuard (role + quyền module)
└── modules
    ├── auth       # đăng ký, đăng nhập (mật khẩu / Google), quên mật khẩu, xác thực email, gia hạn phiên
    ├── account    # cài đặt tài khoản: hồ sơ, ảnh đại diện, đổi mật khẩu, đăng xuất thiết bị khác
    ├── user       # User, EmployeePermission
    ├── store      # Store (thông tin gian hàng hiển thị kèm sản phẩm)
    ├── dashboard  # thống kê tổng quan
    ├── product    # sản phẩm (+ Mongo: product_images, product_specifications, product_use_cases)
    ├── category   # danh mục (+ Mongo: category_images)
    ├── usecase    # Quick Link của danh mục (Mongo: use_cases)
    ├── brand      # thương hiệu
    ├── employee   # nhân viên + phân quyền theo module
    ├── customer   # khách hàng, hạng thành viên theo tổng chi tiêu
    ├── highlight  # Flash sale / Hot trend trên trang chủ
    ├── setting    # cấu hình key/value (site_settings)
    ├── seller     # đơn đăng ký người bán, hồ sơ + ví người bán
    ├── order      # đơn hàng, hoá đơn PDF (Thymeleaf + OpenHTMLtoPDF), gửi email
    ├── review     # đánh giá sản phẩm, người theo dõi gian hàng
    ├── commission # tỉ lệ hoa hồng
    ├── coupon     # voucher
    ├── withdrawal # yêu cầu rút tiền, ví người bán, giải ngân
    ├── payment    # cổng thanh toán MoMo / VNPay / OnePay / SePay (ký & kiểm tra chữ ký)
    └── platformfund # quỹ sàn
```

Mỗi module: `controller → service → repository → entity/document`, dữ liệu vào/ra qua `dto`.

## API chính

| Chức năng   | Endpoint                                                        |
|-------------|-----------------------------------------------------------------|
| Xác thực    | `POST /api/register`, `POST /api/login`, `GET /api/me`, `POST /api/logout`, `POST /api/refresh`, `GET /api/auth/google` |
| Mật khẩu    | `POST /api/forgot-password`, `POST /api/verify-reset-code`, `POST /api/reset-password`, `POST /api/change-password` |
| Tài khoản   | `PATCH /api/profile`, `POST /api/profile/avatar`, `POST /api/logout-others`, `POST /api/email/verification-notification` |
| Dashboard   | `GET /api/admin/dashboard`                                      |
| Sản phẩm    | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`   |
| Danh mục    | `GET/POST /api/categories`, `GET/PATCH/DELETE /api/categories/{id}`, `POST/DELETE /api/categories/{id}/image`, `/api/categories/{id}/use-cases` |
| Thương hiệu | `GET/POST /api/brands`, `GET /api/brands/all`, `GET/PATCH/DELETE /api/brands/{id}` |
| Khách hàng  | `GET /api/admin/customers`, `GET /api/admin/customers/{id}` |
| Nổi bật     | `GET/PUT /api/admin/home-highlights/flash-sale`, `GET /api/admin/home-highlights/products`, `PATCH /api/admin/home-highlights/products/{id}` |
| Người bán   | `GET /api/admin/seller-applications`, `GET .../{id}`, `POST .../{id}/approve`, `POST .../{id}/reject` |
| Gian hàng   | `GET /api/admin/stores`, `PATCH /api/admin/stores/{id}/status` |
| Đơn hàng    | `GET /api/admin/orders`, `GET .../{id}`, `GET .../{id}/invoice/pdf`, `POST .../{id}/invoice/email` |
| Đánh giá    | `GET /api/admin/reviews`, `DELETE /api/admin/reviews/{id}`, `GET /api/admin/store-follows` |
| Hoa hồng    | `GET/POST /api/admin/commissions`, `DELETE /api/admin/commissions/{id}` |
| Voucher     | `GET/POST /api/admin/coupons`, `PATCH/DELETE /api/admin/coupons/{id}` |
| Rút tiền    | `GET /api/admin/withdrawals`, `POST .../{id}/approve`, `POST .../{id}/reject`, `POST .../{id}/pay` |
| Quỹ sàn     | `GET /api/admin/platform-funds/summary`, `.../held`, `.../settlements` |
| Nhân viên   | `GET/POST /api/admin/employees`, `GET/PATCH/DELETE /api/admin/employees/{id}`, `PUT /api/admin/employees/{id}/permissions`, `GET /api/admin/permission-modules` |

Response chung: `{ success, message?, data?, meta?, errors? }`; lỗi validate trả `422` kèm `errors: { field: [message] }`.

## Chạy local

1. Cài JDK 21+ và đặt biến môi trường `JAVA_HOME`.
2. Tạo file cấu hình: `cp .env.example .env` rồi điền thông tin MySQL, `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_URL`
   , SMTP (`MAIL_*`, dùng cho hoá đơn / mã quên mật khẩu / xác thực email), Google OAuth (`GOOGLE_*`)
   và khoá sandbox của cổng thanh toán (`MOMO_*`, `VNPAY_*`, `ONEPAY_*`, `SEPAY_*`).
3. Chạy:

```bash
./mvnw spring-boot:run
```

Chạy kiểm thử (gồm kiểm tra chữ ký các cổng thanh toán):

```bash
./mvnw test
```

API chạy tại `http://localhost:8000`.

## Ghi chú

- Hoá đơn PDF dùng font DejaVu Sans (kèm trong `resources/fonts`) để hiển thị đúng tiếng Việt.
- `ddl-auto: none` — Hibernate không tự thay đổi schema database. Thời gian lưu và xử lý theo UTC.
- `product_specifications.specifications/variants` trong Mongo được lưu dạng chuỗi JSON (một số bản ghi là mảng) —
  backend đọc được cả hai dạng.
