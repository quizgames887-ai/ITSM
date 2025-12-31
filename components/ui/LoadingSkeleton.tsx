export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-3/4 animate-shimmer"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 animate-shimmer"></div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3 animate-shimmer"></div>
        <div className="h-4 bg-slate-200 rounded w-full animate-shimmer"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3 animate-shimmer"></div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-shimmer"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3 animate-shimmer"></div>
        </div>
        <div className="w-12 h-12 bg-slate-200 rounded-lg animate-shimmer"></div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/4 mb-2"></div>
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-20 bg-slate-200 rounded"></div>
                <div className="h-20 bg-slate-200 rounded"></div>
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="h-6 bg-slate-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              <div className="h-16 bg-slate-200 rounded"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
