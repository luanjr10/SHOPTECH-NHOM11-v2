export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-100/60 bg-white p-2 sm:p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="mx-auto my-3 size-[110px] sm:my-4 sm:size-[140px] animate-pulse rounded-xl bg-gray-100" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-3">
        <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
        <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
