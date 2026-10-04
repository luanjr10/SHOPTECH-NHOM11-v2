import TabMenu from "../tabMenu";
import ProductsLaptopPc from "./laptop-pc";
import ProductsPhone from "./phone";
import ProductsWatchVoiceTv from "./watch-voice-tv";

function Products() {
  return (
    <>
      <div className="flex flex-col gap-10 mt-2">
        <ProductsPhone />
        <TabMenu />
        <ProductsLaptopPc />
        <ProductsWatchVoiceTv />
      </div>
    </>
  );
}

export default Products;
