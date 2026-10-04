import { useState } from "react";
import ProductsList from "../components/products/ProductList";

function ManageProductsPage() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <h2 className="text-2xl text-white font-bold font-sans">
          Quản Lý Sản Phẩm
        </h2>
        <ProductsList />
      </div>
    </>
  );
}

export default ManageProductsPage;
