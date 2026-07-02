import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ExternalLink, Download, GitBranch } from "lucide-react";
import { useBuilds, useSyncBuild } from "../../api/builds";
import type { ReleaseJob } from "../../types/build";

const statusLabels: Record<string, string> = {
  queued: "排队中",
  in_progress: "构建中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
};

export function BuildsList() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const { data: builds = [], isLoading, refetch } = useBuilds(
    filterStatus ? { status: filterStatus } : {}
  );
  const syncBuild = useSyncBuild();

  const handleSync = async (id: string) => {
    try {
      await syncBuild.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "同步失败");
    }
  };

  const formatSize = (bytes: number | null): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">构建任务</h3>
          <p className="text-muted-foreground">查看 GitHub Actions 构建状态</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {/* 状态过滤 */}
      <div className="flex gap-2">
        {["", "in_progress", "success", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {status === "" ? "全部" : statusLabels[status] ?? status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中…</div>
      ) : builds.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            暂无构建任务。在「项目管理」页面点击「触发构建」来创建。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {builds.map((build) => (
            <div
              key={build.id}
              className="rounded-lg border bg-card p-4 hover:border-primary/50 cursor-pointer"
              onClick={() => navigate(`/builds/${build.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 状态 */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[build.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {statusLabels[build.status] ?? build.status}
                  </span>

                  {/* 项目名 */}
                  <span className="font-medium">{build.project.name}</span>

                  {/* 版本号 */}
                  {build.releasePlan && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {build.releasePlan.version}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* GitHub Actions 链接 */}
                  <a
                    href={build.githubRunUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GitBranch size={12} />
                    Run #{build.githubRunId}
                    <ExternalLink size={10} />
                  </a>

                  {/* 同步按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSync(build.id);
                    }}
                    disabled={syncBuild.isPending}
                    className="rounded p-1 hover:bg-accent"
                    title="同步状态"
                  >
                    <RefreshCw size={14} className={syncBuild.isPending ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* 详情行 */}
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Workflow: {build.workflowFile}</span>
                <span>触发时间: {new Date(build.createdAt).toLocaleString("zh-CN")}</span>
                {build.artifacts && build.artifacts.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Download size={10} />
                    {build.artifacts.length} 个产物
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
