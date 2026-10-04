import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MapPinPen, Search } from "lucide-react";
import { useLocationContext } from "../../../context/LocationContext";
import { matchesQuery } from "../../../libs/vietnameseSearch";
import { Button } from "../../ui/button";

export function LocationMenu({ className = "" }: { className?: string }) {
  const { provinces, loadingProvinces, selectedProvince, setSelectedProvince } =
    useLocationContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(
    () => provinces.filter((p) => matchesQuery(p.name, query)),
    [provinces, query],
  );

  return (
    <div ref={rootRef} className={`shrink-0 sm:relative ${className}`}>
      <Button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chọn khu vực"
        className="gap-1.5 bg-white/15 backdrop-blur hover:bg-white/25 cursor-pointer"
      >
        <MapPinPen className="size-5" />
        <span className="hidden max-w-[100px] truncate sm:inline">
          {selectedProvince?.name ?? "Toàn quốc"}
        </span>
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-1001 mt-1 overflow-hidden sm:right-auto sm:mt-2 sm:w-72 rounded-xl border border-gray-100 bg-white shadow-2xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="font-sans text-[13px] font-semibold text-gray-800">
              Chọn khu vực của bạn
            </p>
            <p className="mt-0.5 font-sans text-[12px] text-gray-400">
              Ưu tiên hiển thị gian hàng cùng tỉnh — giao nhanh, miễn phí ship
            </p>
          </div>

          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tỉnh/thành..."
              className="w-full text-[14px] text-gray-700 outline-none"
            />
          </div>

          <div className="max-h-[min(18rem,55vh)] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedProvince(null);
                setOpen(false);
                setQuery("");
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-sans text-[14px] hover:bg-primary500/5 ${
                !selectedProvince ? "font-semibold text-primary500" : "text-gray-700"
              }`}
            >
              Toàn quốc (không lọc)
              {!selectedProvince && <Check className="size-4 shrink-0" />}
            </button>

            {loadingProvinces ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-gray-400">
                <Loader2 className="size-4 animate-spin" />
                <span className="font-sans text-[13px]">Đang tải danh sách tỉnh/thành...</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-4 text-center font-sans text-[13px] text-gray-400">
                Không tìm thấy tỉnh/thành phù hợp
              </p>
            ) : (
              filtered.map((province) => {
                const active = selectedProvince?.code === province.code;
                return (
                  <button
                    key={province.code}
                    type="button"
                    onClick={() => {
                      setSelectedProvince(province);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-sans text-[14px] hover:bg-primary500/5 ${
                      active ? "font-semibold text-primary500" : "text-gray-700"
                    }`}
                  >
                    {province.name}
                    {active && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
