import { useState } from "react";
import { X, Save } from "lucide-react";
import { useCreateProject, useUpdateProject } from "../../api/projects";
import type { Project, CreateProjectInput } from "../../types/project";

const projectTypeOptions = [
  { value: "desktop", label: "桌面端" },
  { value: "web", label: "Web 服务" },
  { value: "mobile", label: "移动端" },
  { value: "backend", label: "后端服务" },
  { value: "mixed", label: "混合项目" },
];

interface Props {
  project: Project | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectForm({ project, onSuccess, onCancel }: Props) {
  const isEdit = !!project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [form, setForm] = useState<CreateProjectInput>({
    name: project?.name ?? "",
    repoFullName: project?.repoFullName ?? "",
    defaultBranch: project?.defaultBranch ?? "main",
    projectType: project?.projectType ?? "web",
    workflowFile: project?.workflowFile ?? "release.yml",
    isActive: project?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = "项目名称不能为空";
    if (!form.repoFullName || !/^[\w.-]+\/[\w.-]+$/.test(form.repoFullName)) {
      newErrors.repoFullName = "格式必须为 owner/repo";
    }
    if (!form.workflowFile) newErrors.workflowFile = "Workflow 文件名不能为空";
    if (!form.workflowFile.endsWith(".yml")) {
      newErrors.workflowFile = "必须为 .yml 后缀";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateProject.mutateAsync({ id: project.id, input: form });
      } else {
        await createProject.mutateAsync(form);
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key: keyof CreateProjectInput, value: unknown) => {
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
            {isEdit ? "编辑项目" : "新增项目"}
          </h4>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              项目名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例如：Nowen Note"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              GitHub 仓库 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.repoFullName}
              onChange={(e) => updateField("repoFullName", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="cropflre/nowen-note"
            />
            {errors.repoFullName && (
              <p className="mt-1 text-xs text-destructive">{errors.repoFullName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">默认分支</label>
              <input
                type="text"
                value={form.defaultBranch}
                onChange={(e) => updateField("defaultBranch", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">项目类型</label>
              <select
                value={form.projectType}
                onChange={(e) =>
                  updateField("projectType", e.target.value as CreateProjectInput["projectType"])
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {projectTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Workflow 文件 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.workflowFile}
              onChange={(e) => updateField("workflowFile", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="release.yml"
            />
            {errors.workflowFile && (
              <p className="mt-1 text-xs text-destructive">{errors.workflowFile}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm">
              启用（在发版计划中可见）
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
