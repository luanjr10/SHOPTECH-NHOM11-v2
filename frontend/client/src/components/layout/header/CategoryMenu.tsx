import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import TabCategory from "../../tabcategory";
import { Button } from "../../ui/button";

export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        onClick={() => setOpen((o) => !o)}
        aria-label="Danh mục"
        className="gap-1.5 bg-white/15 backdrop-blur hover:bg-white/25 cursor-pointer"
      >
        <LayoutGrid className="size-5" />
        <span className="hidden sm:inline">Danh Mục</span>
        <ChevronDown className={`hidden size-4 sm:block transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-999 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-1001 mt-2 max-lg:max-h-[70vh] max-lg:overflow-y-auto max-lg:rounded-2xl">
            <TabCategory onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
