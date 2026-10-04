import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { matchesQuery } from "../../libs/vietnameseSearch";

export interface SearchableOption {
  code: number | string;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: SearchableOption[];
  value: SearchableOption | null;
  onChange: (option: SearchableOption) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  loading,
  error,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => matchesQuery(o.name, query)),
    [options, query],
  );

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block font-sans text-[13px] font-medium text-gray-600">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left font-sans text-[14px] outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
          error ? "border-rose-400" : "border-gray-200"
        } ${open ? "border-primary500" : ""}`}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value?.name ?? placeholder}
        </span>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-gray-400" />
        )}
      </button>
      {error && <p className="mt-1 font-sans text-[12px] text-rose-500">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="size-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full text-[14px] outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center font-sans text-[13px] text-gray-400">
                Không tìm thấy kết quả
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left font-sans text-[14px] hover:bg-primary500/5 ${
                    value?.code === option.code
                      ? "bg-primary500/10 font-semibold text-primary500"
                      : "text-gray-700"
                  }`}
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
