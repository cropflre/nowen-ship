export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">仪表盘</h3>
        <p className="text-muted-foreground">Nowen 系列项目发版概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">项目总数</p>
          <p className="mt-2 text-3xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">进行中构建</p>
          <p className="mt-2 text-3xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">今日发版</p>
          <p className="mt-2 text-3xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">失败任务</p>
          <p className="mt-2 text-3xl font-bold text-destructive">—</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h4 className="mb-4 font-semibold">最近活动</h4>
        <p className="text-sm text-muted-foreground">
          Phase 1 初始化中，数据即将接入…
        </p>
      </div>
    </div>
  );
}
