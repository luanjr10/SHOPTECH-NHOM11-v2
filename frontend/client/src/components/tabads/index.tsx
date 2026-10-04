"use client";

import * as React from "react";
import { cn } from "cn";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";

const tabs = [
  { title: "GALAXY Z8 SERIES", description: "Mở bán tặng quà khủng" },
  { title: "IPHONE 17 PRO MAX", description: "Trả góp nhẹ tay. Cực hay" },
  { title: "REDMI NOTE 17 SERIES", description: "Ưu đãi mở bán" },
  { title: "NĂNG ĐỘNG CÙNG ASUS", description: "Ưu đãi mùa tựu trường" },
  { title: "NĂNG ĐỘNG CÙNG ASUS", description: "Ưu đãi mùa tựu trường" },
  { title: "NĂNG ĐỘNG CÙNG ASUS", description: "Ưu đãi mùa tựu trường" },
  { title: "NĂNG ĐỘNG CÙNG ASUS", description: "Ưu đãi mùa tựu trường" },
];

const banners = [
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
];

const subBanners = [
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:50/plain/https://media-asset.cellphones.com.vn/dashboard-v1/mbannnmacpro.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:50/plain/https://media-asset.cellphones.com.vn/dashboard-v1/mbannnmacpro.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:690:300/q:50/plain/https://media-asset.cellphones.com.vn/dashboard-v1/mbannnmacpro.png",
];

export function TabAds() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [tabApi, setTabApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrent(index);
      tabApi?.scrollTo(index);
    };

    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api, tabApi]);

  React.useEffect(() => {
    if (!tabApi) return;

    setCurrent(tabApi.selectedScrollSnap());
    const onSelect = () => setCurrent(tabApi.selectedScrollSnap());

    tabApi.on("select", onSelect);

    return () => {
      tabApi.off("select", onSelect);
    };
  }, [tabApi]);

  const goTo = (index: number) => {
    api?.scrollTo(index);
    tabApi?.scrollTo(index);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.35)]">
      <Carousel setApi={setTabApi} className="w-full border-b border-gray-100">
        <CarouselContent className="ml-0">
          {tabs.map((tab, index) => {
            const isActive = current === index;
            return (
              <CarouselItem key={index} className="basis-1/2 pl-0 sm:basis-1/3 xl:basis-1/4">
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "relative h-12 w-full cursor-pointer px-2 py-1.5 sm:h-14 sm:py-2 text-center font-sans transition-colors",
                    isActive ? "bg-white" : "bg-neutral-50 hover:bg-neutral-100",
                  )}
                >
                  <div
                    className={cn(
                      "truncate text-[12px] font-bold",
                      isActive ? "text-primary500" : "text-neutral-600",
                    )}
                  >
                    {tab.title}
                  </div>
                  <div className="truncate text-[11px] text-neutral-400">
                    {tab.description}
                  </div>
                  <span
                    className={cn(
                      "absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-primary500 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="relative">
        <Carousel
          setApi={setApi}
          className="w-full cursor-grab active:cursor-grabbing"
        >
          <CarouselContent className="ml-0">
            {banners.map((banner, index) => (
              <CarouselItem key={index} className="basis-full pl-0">
                <div className="aspect-[1036/450] w-full">
                  <img
                    src={banner}
                    alt={`Banner ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Chuyển tới banner ${index + 1}`}
              onClick={() => goTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                current === index
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/60 hover:bg-white",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2">
        {subBanners.map((banner, index) => (
          <img
            key={index}
            src={banner}
            alt={`Banner nhỏ ${index + 1}`}
            className="aspect-[690/350] w-full cursor-pointer rounded-lg object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        ))}
      </div>
    </div>
  );
}
