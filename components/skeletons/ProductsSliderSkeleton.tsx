export default function ProductsSliderSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[420px] animate-pulse rounded-xl border border-gray-200 bg-white" />
      ))}
    </div>
  );
}

