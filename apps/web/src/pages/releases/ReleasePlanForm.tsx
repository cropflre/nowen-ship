import { useState } from "react";
import { X, Save } from "lucide-react";
import { useProjects } from "../../api/projects";
import { useCreateReleasePlan, useReleasePlans } from "../../api/releases";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateReleasePlanInput } from "../../types/release";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const releaseTypeOptions = [
  { value: "patch", label: "Patch (1.2.3 → 1.2.4)", desc: "修复 bug，向下兼容" },
  { value: "minor", label: "Minor (1.2.3 → 1.3.0)", desc: "新增功能，向下兼容" },
  { value: "major", label: "Major (1.2.3 → 2.0.0)", desc: "破坏性变更" },
  { value: "prerelease", label: "Prerelease (1.2.3 → 1.2.4-beta.1)", desc: "预发布版本" },
];

export function ReleasePlanForm({ onSuccess, onCancel }: Props) {
  const { data: projects = [] } = useProjects();
  const createPlan = useCreateReleasePlan();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState("");
  const [releaseType, setReleaseType] = useState<CreateReleasePlanInput["releaseType"]>("patch");
  const [sourceBranch, setSourceBranch] = useState("");
  const [changelog, setChangelog] = useState("");
  const [prereleaseTag, setPrereleaseTag] = useState("beta");
  const [targetVersion, setTargetVersion] = useState("");
  const [calculating, setCalculating] = useState(false);

  // 当选择项目和版本类型后，计算目标版本号
  const calculateVersion = async () => {
    if (!projectId) return;
    setCalculating(true);
    try {
      const res = await fetch(
        `/api/releases/plans/calculate-version?projectId=${projectId}&releaseType=${releaseType}`,
        { headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.data) {
        setTargetVersion(data.data.version);
      }
    } catch {
      // ignore
    } finally {
      setCalculating(false);
    }
  };

  // 项目或版本类型变化时自动计算
  const handleProjectChange = (id: string) => {
    setProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setSourceBranch(project.defaultBranch);
      // 延迟计算版本号
      setTimeout(() => calculateVersion(), 100);
    }
  };

  const handleReleaseTypeChange = (type: CreateReleasePlanInput["releaseType"]) => {
    setReleaseType(type);
    setTimeout(() => calculateVersion(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      alert("请选择项目");
      return;
    }

    try {
      await createPlan.mutateAsync({
        projectId,
        releaseType,
        sourceBranch,
        changelog,
        prereleaseTag: releaseType === "prerelease" ? prereleaseTag : undefined,
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold">创建发版计划</h4>
          <button onClick={onCancel} className="rounded p-1 hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 项目选择 */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              项目 <span className="text-destructive">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">请选择项目…</option>
              {projects.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.repoFullName})
                </option>
              ))}
            </select>
          </div>

          {/* 版本类型 */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              版本类型 <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {releaseTypeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                    releaseType === opt.value ? "border-primary bg-primary/5" : "hover:bg-accent/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="releaseType"
                    value={opt.value}
                    checked={releaseType === opt.value}
                    onChange={() => handleReleaseTypeChange(opt.value as CreateReleasePlanInput["releaseType"])}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 目标版本号预览 */}
          {targetVersion && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">目标版本号</p>
              <p className="text-lg font-bold text-primary">v{targetVersion}</p>
            </div>
          )}

          {/* 分支 */}
          <div>
            <label className="mb-1 block text-sm font-medium">源分支</label>
            <input
              type="text"
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Prerelease tag */}
          {releaseType === "prerelease" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Prerelease 标签</label>
              <input
                type="text"
                value={prereleaseTag}
                onChange={(e) => setPrereleaseTag(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="beta, alpha, rc"
              />
            </div>
          )}

          {/* Changelog */}
          <div>
            <label className="mb-1 block text-sm font-medium">Changelog</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="描述本次发版的主要变更…"
            />
          </div>

          {/* 按钮 */}
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
              disabled={createPlan.isPending || !projectId}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={14} />
              {createPlan.isPending ? "创建中…" : "创建发版计划"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
