import CustomerList from "../components/customer/CustomerList";

function ManageCustomerPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="text-2xl text-white font-bold font-sans">
        Quản Lý Khách Hàng
      </h2>
      <CustomerList />
    </div>
  );
}

export default ManageCustomerPage;
