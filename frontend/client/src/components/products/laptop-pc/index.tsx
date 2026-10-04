import { ProductSection } from "../ProductSection/ProductSection";

function ProductsLaptopPc() {
  return (
    <div className="space-y-10">
      <ProductSection
        categories={[
          { code: "CATE-01", label: "LAPTOP" },
          { code: "CATE-05", label: "MÀN HÌNH PC" },
          { code: "CAT-018", label: "PC" },
          { code: "CATE-020", label: "PHỤ KIỆN PC" },
        ]}
        banners={[
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:795/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01KVFPDXRAJ749QHYHQKZFR23W.png",
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:795/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01KZD8WE77VRAM99YMMMSHFJ84.png",
        ]}
      />
    </div>
  );
}

export default ProductsLaptopPc;
