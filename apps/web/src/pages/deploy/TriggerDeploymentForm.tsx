import { useState } from "react";
import { X, Rocket } from "lucide-react";
import { useProjects } from "../../api/projects";
import { useDeployTargets, useTriggerDeployment } from "../../api/deploy";

interface Props {
  defaultProjectId?: string;
  defaultTargetId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TriggerDeploymentForm({
  defaultProjectId,
  defaultTargetId,
  onSuccess,
  onCancel,
}: Props) {
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const { data: targets = [] } = useDeployTargets(projectId || undefined);
  const trigger = useTriggerDeployment();

  const [deployTargetId, setDeployTargetId] = useState(defaultTargetId ?? "");
  const [version, setVersion] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!projectId) newErrors.projectId = "请选择项目";
    if (!deployTargetId) newErrors.deployTargetId = "请选择部署目标";
    if (!version) newErrors.version = "版本号不能为空";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await trigger.mutateAsync({
        projectId,
        deployTargetId,
        version,
        commitSha: commitSha || undefined,
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "触发部署失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">触发部署</h4>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              项目 <span className="text-destructive">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setDeployTargetId("");
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-xs text-destructive">{errors.projectId}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              部署目标 <span className="text-destructive">*</span>
            </label>
            <select
              value={deployTargetId}
              onChange={(e) => setDeployTargetId(e.target.value)}
              disabled={!projectId}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">请选择部署目标</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.environment}）
                </option>
              ))}
            </select>
            {errors.deployTargetId && (
              <p className="mt-1 text-xs text-destructive">{errors.deployTargetId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                版本号 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如：1.2.0"
              />
              {errors.version && (
                <p className="mt-1 text-xs text-destructive">{errors.version}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Commit SHA</label>
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="可选"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Rocket size={14} />
              {submitting ? "部署中…" : "部署"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
