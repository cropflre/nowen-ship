import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, RefreshCw, ExternalLink } from "lucide-react";
import { useDeployments, useSyncDeployment } from "../../api/deploy";
import { TriggerDeploymentForm } from "./TriggerDeploymentForm";
import type { Deployment, DeploymentStatus } from "../../types/deploy";

const statusLabels: Record<DeploymentStatus, string> = {
  queued: "排队中",
  in_progress: "进行中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const statusBadgeStyles: Record<DeploymentStatus, string> = {
  queued: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        statusBadgeStyles[status]
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export function Deployments() {
  const [searchParams] = useSearchParams();
  const prefillProjectId = searchParams.get("projectId") ?? undefined;
  const prefillTargetId = searchParams.get("targetId") ?? undefined;

  const { data: deployments = [], isLoading, error } = useDeployments(
    prefillProjectId || undefined
  );
  const syncDeployment = useSyncDeployment();
  const [showTrigger, setShowTrigger] = useState(false);

  const handleSync = async (id: string) => {
    try {
      await syncDeployment.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "同步失败");
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">加载中…</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        加载失败：{error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">部署记录</h3>
          <p className="text-muted-foreground">追踪各环境与目标的部署执行情况</p>
        </div>
        <button
          onClick={() => setShowTrigger(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          触发部署
        </button>
      </div>

      {deployments.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            暂无部署记录，点击「触发部署」开始一次部署。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">项目</th>
                <th className="px-4 py-3 text-left font-medium">目标</th>
                <th className="px-4 py-3 text-left font-medium">版本</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">触发者</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deployments.map((d: Deployment) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {d.project?.name ?? d.projectId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.deployTarget?.name ?? d.deployTargetId}
                  </td>
                  <td className="px-4 py-3">{d.version}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.triggeredBy}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.createdAt
                      ? new Date(d.createdAt).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSync(d.id)}
                        className="rounded p-1 hover:bg-accent"
                        title="同步状态"
                      >
                        <RefreshCw size={14} />
                      </button>
                      {d.githubRunUrl && (
                        <a
                          href={d.githubRunUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1 hover:bg-accent"
                          title="查看 GitHub Run"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTrigger && (
        <TriggerDeploymentForm
          defaultProjectId={prefillProjectId}
          defaultTargetId={prefillTargetId}
          onSuccess={() => setShowTrigger(false)}
          onCancel={() => setShowTrigger(false)}
        />
      )}
    </div>
  );
}
