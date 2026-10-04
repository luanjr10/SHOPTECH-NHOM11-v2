const DEFAULT_BANNERS = [
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
  "https://cdn2.cellphones.com.vn/insecure/rs:fill:1036:450/q:100/plain/https://media-asset.cellphones.com.vn/dashboard-v1/manage-banner/advaSVasaa.png",
];

interface CategoryBannerProps {
  banners?: string[];
}

export function CategoryBanner({ banners = DEFAULT_BANNERS }: CategoryBannerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {banners.map((banner, index) => (
        <a
          key={index}
          className="block overflow-hidden rounded-2xl border border-gray-100 shadow-sm cursor-pointer"
        >
          <img
            src={banner}
            alt={`Banner ${index + 1}`}
            className="aspect-[1036/300] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        </a>
      ))}
    </div>
  );
}
