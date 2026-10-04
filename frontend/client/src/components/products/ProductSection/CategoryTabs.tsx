import { cn } from "cn";

export interface CategoryTab {
  label: string;
}

interface CategoryTabsProps {
  tabs: CategoryTab[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function CategoryTabs({ tabs, activeIndex, onChange }: CategoryTabsProps) {
  return (
    <div className="flex flex-row items-stretch rounded-sm bg-white">
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <div key={tab.label} className="flex flex-1 items-stretch">
            {index > 0 && (
              <div className="my-auto h-5 border-l border-neutral-200" />
            )}
            <button
              type="button"
              onClick={() => onChange(index)}
              className={cn(
                "relative flex-1 cursor-pointer px-2 py-3 font-sans text-[14px] font-bold transition-colors sm:px-6 sm:py-4 sm:text-[19px]",
                isActive
                  ? "bg-linear-to-b from-white to-primary300/25 text-primary500"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 sm:inset-x-6 h-[3px] rounded-full bg-primary500 transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
