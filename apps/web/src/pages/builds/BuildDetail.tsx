import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, RefreshCw, Download } from "lucide-react";
import { useBuild, useSyncBuild, useSyncArtifacts } from "../../api/builds";
import { formatDuration } from "../../lib/utils";

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

export function BuildDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: build, isLoading, refetch } = useBuild(id!);
  const syncBuild = useSyncBuild();
  const syncArtifacts = useSyncArtifacts();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">加载中…</div>;
  }

  if (!build) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        构建任务不存在。
        <Link to="/builds" className="ml-2 text-primary hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  const platformLabels: Record<string, string> = {
    win: "Windows",
    mac: "macOS",
    linux: "Linux",
    all: "通用",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/builds" className="rounded p-1 hover:bg-accent">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h3 className="text-2xl font-bold">
            {build.project.name} — Run #{build.githubRunId}
          </h3>
          <p className="text-muted-foreground">
            {build.workflowFile} · {new Date(build.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">状态</p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium ${
              statusColors[build.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {statusLabels[build.status] ?? build.status}
          </span>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">耗时</p>
          <p className="mt-1 text-lg font-semibold">
            {formatDuration(build.startedAt ?? undefined, build.completedAt ?? undefined)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">GitHub Actions</p>
          <a
            href={build.githubRunUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            查看运行详情
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            try {
              await syncBuild.mutateAsync(build.id);
              refetch();
            } catch (err) {
              alert(err instanceof Error ? err.message : "同步失败");
            }
          }}
          disabled={syncBuild.isPending}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncBuild.isPending ? "animate-spin" : ""} />
          同步状态
        </button>
        {build.status === "success" && (
          <button
            onClick={async () => {
              try {
                await syncArtifacts.mutateAsync(build.id);
                refetch();
              } catch (err) {
                alert(err instanceof Error ? err.message : "同步失败");
              }
            }}
            disabled={syncArtifacts.isPending}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download size={14} />
            同步构建产物
          </button>
        )}
      </div>

      {/* 构建产物 */}
      {build.artifacts && build.artifacts.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 font-semibold">构建产物</div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">名称</th>
                <th className="px-4 py-2 text-left font-medium">平台</th>
                <th className="px-4 py-2 text-left font-medium">大小</th>
                <th className="px-4 py-2 text-left font-medium">过期时间</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {build.artifacts.map((artifact) => (
                <tr key={artifact.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{artifact.name}</td>
                  <td className="px-4 py-2">
                    {artifact.platform ? platformLabels[artifact.platform] ?? artifact.platform : "-"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {artifact.sizeBytes
                      ? `${(Number(artifact.sizeBytes) / (1024 * 1024)).toFixed(1)} MB`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {artifact.expiresAt
                      ? new Date(artifact.expiresAt).toLocaleDateString("zh-CN")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 原始数据（调试用） */}
      {build.status === "failed" && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 font-semibold text-destructive">构建失败</p>
          <p className="text-sm text-muted-foreground">
            请访问{" "}
            <a href={build.githubRunUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              GitHub Actions
            </a>{" "}
            查看详细错误日志。
          </p>
        </div>
      )}
    </div>
  );
}
