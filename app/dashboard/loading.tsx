import { Skeleton } from '@/components/ui/skeleton'

function SkeletonCard() {
  return (
    <div className="rounded-[22px] border border-[#eadff4] bg-white p-5 shadow-[0_16px_45px_rgba(83,48,122,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-full bg-[#eee6f5]" />
          <Skeleton className="h-8 w-20 rounded-full bg-[#eee6f5]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full bg-[#eee6f5]" />
      </div>
      <Skeleton className="mt-4 h-3 w-36 rounded-full bg-[#eee6f5]" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex w-full flex-col gap-6">
      <section className="space-y-3">
        <Skeleton className="h-9 w-56 rounded-full bg-[#eee6f5]" />
        <Skeleton className="h-5 w-full max-w-md rounded-full bg-[#eee6f5]" />
      </section>

      <section>
        <Skeleton className="h-[86px] rounded-[22px] bg-[#cda0e9]" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-[22px] bg-[#eee6f5]" />
        <Skeleton className="h-32 rounded-[22px] bg-[#eee6f5]" />
        <Skeleton className="h-32 rounded-[22px] bg-[#eee6f5]" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-[22px] bg-[#eee6f5]" />
        <Skeleton className="h-72 rounded-[22px] bg-[#eee6f5]" />
      </section>
    </div>
  )
}
