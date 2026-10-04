import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-gray-300">
        <ImageOff size={48} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <img
          src={images[activeIndex]}
          alt={name}
          className="max-h-full max-w-full object-contain transition-opacity duration-200"
        />
      </div>

      {images.length > 1 && (
        <div className="flex flex-row gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-1 transition-colors ${
                index === activeIndex
                  ? "border-primary500 ring-1 ring-primary500"
                  : "border-gray-200 hover:border-primary300"
              }`}
            >
              <img
                src={image}
                alt={`${name} ${index + 1}`}
                className="max-h-full max-w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
