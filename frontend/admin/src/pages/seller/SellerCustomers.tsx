import { useAuth } from "../../context/AuthContext";
import SellerCustomerList from "../../components/customer/SellerCustomerList";

export default function SellerCustomers() {
  const { activeStore } = useAuth();

  if (!activeStore) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="font-sans text-2xl font-bold text-white">Khách hàng</h2>
        <p className="text-sm text-gray-400">Bạn cần tạo/chọn 1 gian hàng trước.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="font-sans text-2xl font-bold text-white">Khách hàng</h2>
      <SellerCustomerList />
    </div>
  );
}
