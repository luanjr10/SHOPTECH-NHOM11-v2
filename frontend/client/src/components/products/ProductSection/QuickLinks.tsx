import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../ui/carousel";
import { type UseCase } from "../../../types/product";

interface QuickLinksProps {
  links: UseCase[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
}

export function QuickLinks({ links, activeSlug, onSelect }: QuickLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className="relative mt-3">
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent className="ml-0 gap-2">
          {links.map((link) => {
            const active = activeSlug === link.slug;

            return (
              <CarouselItem key={link.id} className="basis-auto pl-0">
                <button
                  type="button"
                  onClick={() => onSelect?.(link.slug)}
                  className={`flex min-w-[120px] cursor-pointer sm:min-w-[140px] flex-row items-center rounded-lg p-1 transition-colors ${
                    active
                      ? "bg-primary300/30 ring-2 ring-primary300"
                      : "bg-primary200 hover:bg-primary300/20"
                  }`}
                >
                  <img className="w-10 shrink-0" src={link.image} alt={link.name} />
                  <p className="whitespace-pre-line text-left font-sans text-[12px] font-bold sm:text-[13px]">
                    {link.name}
                  </p>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-0 hidden size-7 sm:inline-flex -translate-x-1/2 border-gray-200 bg-white shadow-md" />
        <CarouselNext className="right-0 hidden size-7 sm:inline-flex translate-x-1/2 border-gray-200 bg-white shadow-md" />
      </Carousel>
    </div>
  );
}
