import { Link } from "react-router-dom";

/** Trang chủ tạm thời — các khối Flash sale / sản phẩm nổi bật được bổ sung ở phần "Trang chủ". */
function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col items-center gap-4 px-3 py-16 text-center sm:px-4">
      <h1 className="text-2xl font-bold text-gray-800">Chào mừng đến với ShopTech</h1>
      <p className="text-gray-500">Khám phá các gian hàng công nghệ trên sàn.</p>
      <Link
        to="/gian-hang"
        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
      >
        Xem gian hàng
      </Link>
    </div>
  );
}

export default Home;
