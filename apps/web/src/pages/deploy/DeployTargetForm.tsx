import { useState } from "react";
import { X, Save } from "lucide-react";
import {
  useCreateDeployTarget,
  useUpdateDeployTarget,
} from "../../api/deploy";
import type {
  DeployTarget,
  CreateDeployTargetInput,
  DeployEnvironment,
  DeployTargetType,
} from "../../types/deploy";

const environmentOptions: { value: DeployEnvironment; label: string }[] = [
  { value: "dev", label: "开发" },
  { value: "staging", label: "预发" },
  { value: "prod", label: "生产" },
];

const typeOptions: { value: DeployTargetType; label: string }[] = [
  { value: "server", label: "服务器" },
  { value: "static", label: "静态资源" },
  { value: "docker", label: "Docker" },
  { value: "k8s", label: "Kubernetes" },
  { value: "mobile", label: "移动端" },
  { value: "desktop", label: "桌面端" },
];

interface Props {
  projectId: string;
  target: DeployTarget | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DeployTargetForm({ projectId, target, onSuccess, onCancel }: Props) {
  const isEdit = !!target;
  const createTarget = useCreateDeployTarget();
  const updateTarget = useUpdateDeployTarget();

  const [form, setForm] = useState<CreateDeployTargetInput>({
    projectId,
    name: target?.name ?? "",
    environment: target?.environment ?? "staging",
    type: target?.type ?? "server",
    isActive: target?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = "目标名称不能为空";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateTarget.mutateAsync({ id: target.id, input: form });
      } else {
        await createTarget.mutateAsync(form);
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key: keyof CreateDeployTargetInput, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">
            {isEdit ? "编辑部署目标" : "新增部署目标"}
          </h4>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              目标名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例如：生产环境服务器"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">环境</label>
              <select
                value={form.environment}
                onChange={(e) =>
                  updateField("environment", e.target.value as DeployEnvironment)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {environmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">类型</label>
              <select
                value={form.type}
                onChange={(e) =>
                  updateField("type", e.target.value as DeployTargetType)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveTarget"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
            />
            <label htmlFor="isActiveTarget" className="text-sm">
              启用
            </label>
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
              <Save size={14} />
              {submitting ? "保存中…" : isEdit ? "更新" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
