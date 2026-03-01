/** Full-page loading spinner */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-hotstar-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
        </div>
        <span className="text-gray-400 text-sm animate-pulse">Loading...</span>
      </div>
    </div>
  );
}

/** Card skeleton for content rows */
export function CardSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-36 sm:w-44 md:w-52 aspect-[2/3] shimmer rounded-lg"
        />
      ))}
    </div>
  );
}

/** Hero skeleton */
export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] sm:h-[80vh] shimmer">
      <div className="absolute bottom-16 left-8 sm:left-16 space-y-3">
        <div className="w-48 h-8 shimmer rounded" />
        <div className="w-80 h-4 shimmer rounded" />
        <div className="w-64 h-4 shimmer rounded" />
        <div className="flex gap-3 mt-4">
          <div className="w-32 h-11 shimmer rounded-lg" />
          <div className="w-32 h-11 shimmer rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Row with title skeleton */
export function RowSkeleton() {
  return (
    <div className="px-4 sm:px-8 lg:px-12 mb-10">
      <div className="w-40 h-6 shimmer rounded mb-4" />
      <CardSkeleton />
    </div>
  );
}
