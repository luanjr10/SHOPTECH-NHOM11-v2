import { ProductSection } from "../ProductSection/ProductSection";

function ProductsWatchVoiceTv() {
  return (
    <div className="space-y-10">
      <ProductSection
        categories={[
          { code: "CATE-019", label: "ĐỒNG HỒ" },
          { code: "CATE-03", label: "TAI NGHE" },
          { code: "CATE-022", label: "TV" },
        ]}
        banners={[
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:960/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01M27B8Y5D015V9GBRQRHQGKDV.jpg",
          "https://cdn2.cellphones.com.vn/insecure/rs:fill:321:960/q:100/plain/https://media-asset.cellphones.com.vn/page_configs/01K9XZX2K0Q0BX8QSVAGM40QYM.png",
        ]}
      />
    </div>
  );
}

export default ProductsWatchVoiceTv;
