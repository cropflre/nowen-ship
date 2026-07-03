import { useState } from "react";
import { Plus, Pencil, Trash2, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useDeployTargets,
  useDeleteDeployTarget,
} from "../../api/deploy";
import { DeployTargetForm } from "./DeployTargetForm";
import type { DeployTarget } from "../../types/deploy";

const environmentLabels: Record<string, string> = {
  dev: "开发",
  staging: "预发",
  prod: "生产",
};

const typeLabels: Record<string, string> = {
  server: "服务器",
  static: "静态资源",
  docker: "Docker",
  k8s: "Kubernetes",
  mobile: "移动端",
  desktop: "桌面端",
};

const environmentBadgeStyles: Record<string, string> = {
  dev: "bg-blue-100 text-blue-700",
  staging: "bg-amber-100 text-amber-700",
  prod: "bg-red-100 text-red-700",
};

export function DeployTargets() {
  const navigate = useNavigate();
  const { data: targets = [], isLoading, error } = useDeployTargets();
  const deleteTarget = useDeleteDeployTarget();
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<DeployTarget | null>(null);
  const [formProjectId, setFormProjectId] = useState("");

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除部署目标「${name}」吗？`)) return;
    try {
      await deleteTarget.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTarget(null);
  };

  const openNew = (projectId: string) => {
    setFormProjectId(projectId);
    setEditingTarget(null);
    setShowForm(true);
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
          <h3 className="text-2xl font-bold">部署目标</h3>
          <p className="text-muted-foreground">管理各项目的部署环境与目标</p>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            暂无部署目标，请先在「项目管理」中确认项目存在，再添加部署目标。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">目标名称</th>
                <th className="px-4 py-3 text-left font-medium">项目</th>
                <th className="px-4 py-3 text-left font-medium">环境</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {targets.map((target) => (
                <tr key={target.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{target.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {target.project?.name ?? target.projectId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        environmentBadgeStyles[target.environment] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {environmentLabels[target.environment] ?? target.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {typeLabels[target.type] ?? target.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        target.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {target.isActive ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/deployments?projectId=${target.projectId}&targetId=${target.id}`
                          )
                        }
                        className="rounded p-1 text-primary hover:bg-primary/10"
                        title="部署"
                      >
                        <Rocket size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setFormProjectId(target.projectId);
                          setEditingTarget(target);
                          setShowForm(true);
                        }}
                        className="rounded p-1 hover:bg-accent"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(target.id, target.name)}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DeployTargetForm
          projectId={formProjectId}
          target={editingTarget}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingTarget(null);
          }}
        />
      )}

      {!showForm && targets.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => openNew(targets[0].projectId)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            新增部署目标
          </button>
        </div>
      )}
    </div>
  );
}
