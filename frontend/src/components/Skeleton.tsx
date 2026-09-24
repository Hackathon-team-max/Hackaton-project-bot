export function Skeleton({ h = 16, w = "100%", r = 8 }: { h?: number | string; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden />;
}

export function ServiceCardSkeleton() {
  return (
    <div className="card service-card">
      <div className="row" style={{ gap: 12 }}>
        <Skeleton h={44} w={44} r={12} />
        <div style={{ flex: 1 }}>
          <Skeleton h={16} w="70%" />
          <div style={{ height: 8 }} />
          <Skeleton h={12} w="95%" />
        </div>
      </div>
    </div>
  );
}
