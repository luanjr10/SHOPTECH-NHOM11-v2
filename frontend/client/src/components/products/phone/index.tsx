import { ProductSection } from "../ProductSection/ProductSection";

function ProductsPhone() {
  return (
    <div className="space-y-10">
      <ProductSection
        categories={[
          { code: "CATE-02", label: "ĐIỆN THOẠI" },
          { code: "CATE-012", label: "MÁY TÍNH BẢNG" },
        ]}
        banners={[
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:795/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01M1HCW0SQ1C7BKQZYSRC8X51F.png",
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:795/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01M1112T6S9NF8YQCE57ZN0YG2.jpg",
        ]}
      />
    </div>
  );
}

export default ProductsPhone;
