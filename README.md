# ShopTech

Hệ thống quản trị sàn thương mại điện tử bán đồ công nghệ.

| Thư mục            | Mô tả                                                                 |
|--------------------|-----------------------------------------------------------------------|
| `backend/`         | REST API — Java Spring Boot (Spring MVC, JPA/MySQL, MongoDB, Spring Security + JWT) |
| `frontend/admin/`  | Giao diện quản trị — React + TypeScript + Vite + Tailwind CSS         |
| `frontend/client/` | Trang mua sắm cho khách hàng — React + TypeScript + Vite + Tailwind CSS |

## Chức năng

- **Dashboard** — KPI 30 ngày, doanh thu theo phương thức thanh toán, top danh mục / gian hàng / khách hàng, hoạt động gần đây
- **Quản lý sản phẩm** — thêm/sửa/xoá, nhiều ảnh, thông số kỹ thuật, biến thể (SKU, giá, tồn kho), Quick Link
- **Quản lý danh mục** — danh mục cha/con, hiển thị bằng icon hoặc ảnh, gắn thương hiệu, Quick Link
- **Quản lý thương hiệu** — thêm/sửa/xoá, logo
- **Quản lý nhân viên** — tạo tài khoản nhân viên, phân quyền xem/thêm/sửa/xoá theo từng chức năng
- **Khách hàng** — danh sách, tổng chi tiêu, hạng thành viên (Đồng/Bạc/Vàng/Kim Cương), lịch sử đơn
- **Nổi bật trang chủ** — hẹn giờ kết thúc Flash sale, chọn sản phẩm Flash sale / Hot trend
- **Người bán** — duyệt / từ chối đơn đăng ký mở gian hàng
- **Gian hàng** — theo dõi, tạm ẩn / kích hoạt gian hàng
- **Đơn hàng & Hoá đơn** — xem chi tiết đơn theo gian hàng, xuất hoá đơn PDF, gửi hoá đơn qua email
- **Đánh giá & Theo dõi** — kiểm duyệt đánh giá sản phẩm, xem người theo dõi gian hàng
- **Hoa hồng** — tỉ lệ hoa hồng mặc định / theo danh mục / theo gian hàng
- **Voucher** — mã giảm % / số tiền / miễn phí vận chuyển, giới hạn theo hạng khách hàng
- **Rút tiền** — duyệt, từ chối, giải ngân qua MoMo / VNPay / OnePay / SePay (sandbox)
- **Quỹ sàn** — tiền đang giữ hộ người bán, tiền đã quyết toán, tổng đã chi trả
- **Cài đặt tài khoản** — hồ sơ, ảnh đại diện, đổi mật khẩu, đăng xuất thiết bị khác
- **Đăng ký / Đăng nhập** — đăng ký, đăng nhập (mật khẩu hoặc Google), quên mật khẩu bằng mã email, xác thực email

### Kênh người bán (Seller Center)

Người bán đăng nhập chung trang quản trị, menu hiển thị theo vai trò; chọn gian hàng đang quản lý ở thanh trên cùng.

- **Dashboard gian hàng** — doanh thu thực nhận, đơn hoàn tất, khách hàng (30 ngày), top sản phẩm / danh mục / khách hàng, hoạt động gần đây, số dư ví
- **Gian hàng** — tạo gian hàng (chờ admin duyệt), sửa tên / mô tả / logo, chuyển gian hàng đang quản lý
- **Sản phẩm** — thêm/sửa/xoá sản phẩm của gian hàng (dùng chung form với admin), tìm kiếm, sắp xếp, phân trang
- **Đơn hàng & Hoá đơn** — xác nhận / huỷ đơn, bàn giao vận chuyển (trừ kho, giữ tiền vào ví), đánh dấu đã giao / giao thất bại, hoá đơn PDF và gửi email
- **Khách hàng** — khách đã mua tại gian hàng, hạng thành viên, số tiền đã chi, lịch sử đơn
- **Hoàn trả / Bảo hành** — xem yêu cầu kèm ảnh minh chứng, duyệt / từ chối và email phản hồi cho khách
- **Đánh giá & Theo dõi** — đánh giá sản phẩm của gian hàng (điểm trung bình, lọc theo số sao), người theo dõi
- **Kho hàng** — tồn kho, lọc sản phẩm sắp hết hàng, nhập thêm / xuất hao hụt, lịch sử điều chỉnh
- **Doanh thu** — số đơn hoàn tất, tổng giá trị đơn, hoa hồng sàn, doanh thu thực nhận theo 7 / 30 / 90 ngày, biểu đồ theo ngày
- **Ví** — tổng số dư, tiền đang giữ, tiền có thể rút, lịch sử biến động ví
- **Rút tiền** — tạo yêu cầu rút (chuyển khoản / MoMo / VNPay / OnePay / SePay), theo dõi trạng thái duyệt
- **Cài đặt gian hàng** — thông tin gian hàng, địa chỉ lấy hàng theo danh mục tỉnh / quận / phường của Giao Hàng Nhanh

### Trang khách hàng (frontend/client)

- **Trang chủ** — danh mục, banner, Deal sốc, Flash sale (đếm ngược), sản phẩm nổi bật theo từng danh mục
- **Thanh toán** — phí vận chuyển GHN theo từng gian hàng (cùng tỉnh miễn phí, giao 2 giờ), mã giảm giá / voucher, đặt hàng tách theo gian hàng, thanh toán COD / MoMo / VNPay (sandbox), trang kết quả thanh toán
- **Chatbot AI** — trợ lý tư vấn (Groq), tự tra sản phẩm thật theo nhu cầu / ngân sách, gợi ý kèm thẻ sản phẩm
- **Đăng ký / Đăng nhập** — tài khoản khách hàng (mật khẩu hoặc Google), quên mật khẩu
- **Giỏ hàng** — lưu theo tài khoản, chọn biến thể, kiểm tra tồn kho, tạm tính theo giá hiện tại
- **Hồ sơ & cài đặt chung** — hồ sơ, ảnh đại diện, đơn hàng của tôi (xem / huỷ, xác nhận đã nhận hàng), hạng thành viên & nhận voucher theo hạng, sổ địa chỉ (tỉnh / quận / phường GHN), đổi mật khẩu, đăng xuất thiết bị khác
- **Kênh người bán** — gửi đơn đăng ký mở gian hàng, theo dõi trạng thái duyệt
- **Gian hàng & chi tiết shop** — danh sách gian hàng (tìm kiếm, sắp xếp), trang shop với chỉ số uy tín, danh mục, sản phẩm, theo dõi gian hàng
- **Yêu cầu hoàn trả / Bảo hành** — gửi yêu cầu hoàn trả hoặc bảo hành kèm ảnh minh chứng cho sản phẩm trong đơn đã hoàn tất

## Phân công

| Thành viên     | Chức năng phụ trách                                                                 |
|----------------|--------------------------------------------------------------------------------------|
| Bùi Văn Luân   | Dashboard, Quản lý sản phẩm, Quản lý danh mục, Quản lý thương hiệu, Quản lý nhân viên; Kênh người bán: Dashboard, Gian hàng, Sản phẩm, Kho hàng; Trang khách hàng: Trang chủ, Thanh toán MoMo / VNPay, Chatbot AI |
| Hồ Trọng Dũng  | Khách hàng, Nổi bật trang chủ, Người bán, Gian hàng, Đơn hàng & Hoá đơn, Đánh giá & Theo dõi; Kênh người bán: Đơn hàng & Hoá đơn, Khách hàng, Hoàn trả / Bảo hành, Đánh giá & Theo dõi |
| Nguyễn Phạm Thành Công | Hoa hồng, Voucher, Rút tiền, Quỹ sàn, Cài đặt tài khoản, Đăng ký / Đăng nhập; Kênh người bán: Doanh thu, Ví, Rút tiền, Cài đặt gian hàng; Trang khách hàng: Đăng ký / Đăng nhập, Giỏ hàng, Hồ sơ & cài đặt chung, Kênh người bán, Gian hàng & chi tiết shop, Yêu cầu hoàn trả |

## Kiến trúc

```
React (frontend/admin, frontend/client)
        │  REST / JSON (JWT trong cookie HttpOnly)
        ▼
Spring Boot (backend) — Modular Monolith
  controller → service → repository → entity / document
        │
   ┌────┴────┐
   ▼         ▼
 MySQL    MongoDB
```

## Chạy local

```bash
# Backend (cần JDK 21+, cấu hình backend/.env theo backend/.env.example)
cd backend
./mvnw spring-boot:run
```

```bash
# Frontend (trang quản trị hoặc trang khách hàng)
cd frontend/admin   # hoặc: cd frontend/client
npm install
npm run dev
```

Backend chạy ở `http://localhost:8000`, trang quản trị ở `http://localhost:5173`, trang khách hàng ở `http://localhost:5175`.
