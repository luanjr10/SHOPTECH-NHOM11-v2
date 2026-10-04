import TabIntroduce from "../components/tabintroduce/index";
import { TabAds } from "../components/tabads/index";
import TabCategory from "../components/tabcategory/index";
import DealShock from "../components/dealShock/index";
import FlashSaleSection from "../components/flashSale/index";
import DailyDealsSection from "../components/dailyDeals/index";
import Products from "../components/products/index";
function Home() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-2 px-3 py-2 sm:px-4">
        <div className="mb-2 flex flex-row items-stretch gap-3">
          <div className="hidden lg:flex">
            <TabCategory />
          </div>
          <TabAds />
          <div className="hidden md:flex">
            <TabIntroduce />
          </div>
        </div>
        <DealShock />
        <FlashSaleSection />
        <DailyDealsSection />
        <Products />
      </div>
    </>
  );
}

export default Home;
