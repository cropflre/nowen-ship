import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "仪表盘",
  "/projects": "项目管理",
  "/releases": "发版计划",
  "/builds": "构建任务",
  "/audit-logs": "审计日志",
};

export function TopBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Nowen Release Hub";

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-full items-center justify-between px-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Phase 1 — 项目初始化中
          </span>
        </div>
      </div>
    </header>
  );
}
