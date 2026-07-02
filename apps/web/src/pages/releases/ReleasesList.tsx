import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GitBranch, Tag, Rocket, Globe } from "lucide-react";
import { useReleasePlans, useCreateTag, useTriggerBuildForPlan, useCreateGitHubRelease, usePublishGitHubRelease } from "../../api/releases";
import { useProjects } from "../../api/projects";
import { ReleasePlanForm } from "./ReleasePlanForm";
import type { ReleasePlan } from "../../types/release";

const statusLabels: Record<string, string> = {
  draft: "草稿",
  pending: "待构建",
  building: "构建中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-blue-100 text-blue-700",
  building: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
};

export function ReleasesList() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading, refetch } = useReleasePlans();
  const { data: projects = [] } = useProjects();
  const [showForm, setShowForm] = useState(false);

  const createTag = useCreateTag();
  const triggerBuild = useTriggerBuildForPlan();
  const createRelease = useCreateGitHubRelease();
  const publishRelease = usePublishGitHubRelease();

  const getProjectName = (projectId: string) => {
    const p = projects.find((p) => p.id === projectId);
    return p ? p.name : projectId;
  };

  const handleAction = async (plan: ReleasePlan, action: string) => {
    try {
      switch (action) {
        case "tag":
          await createTag.mutateAsync(plan.id);
          alert(`Tag ${plan.tagName} 创建成功！`);
          break;
        case "build":
          await triggerBuild.mutateAsync(plan.id);
          alert("构建已触发！");
          break;
        case "draft":
          await createRelease.mutateAsync(plan.id);
          alert("GitHub Release draft 已创建！");
          break;
        case "publish":
          if (!confirm(`确定要发布 ${plan.tagName} 吗？发布后不可撤回！`)) return;
          await publishRelease.mutateAsync(plan.id);
          alert("Release 已发布！");
          break;
      }
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">发版计划</h3>
          <p className="text-muted-foreground">管理版本发布计划</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          创建发版计划
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中…</div>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">暂无发版计划，点击「创建发版计划」开始。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border bg-card p-4 hover:border-primary/50 cursor-pointer"
              onClick={() => navigate(`/releases/${plan.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[plan.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {statusLabels[plan.status] ?? plan.status}
                  </span>
                  <span className="font-bold text-primary">{plan.tagName}</span>
                  <span className="text-sm text-muted-foreground">
                    {getProjectName(plan.projectId)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 操作按钮 */}
                  {plan.status === "draft" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(plan, "build");
                        }}
                        className="rounded px-2 py-1 text-xs hover:bg-accent"
                        title="触发构建"
                      >
                        <Rocket size={14} />
                      </button>
                    </>
                  )}
                  {plan.githubRelease && plan.githubRelease.draft && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(plan, "publish");
                      }}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                    >
                      发布
                    </button>
                  )}
                </div>
              </div>
              {plan.changelog && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {plan.changelog}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>分支: {plan.sourceBranch}</span>
                <span>创建: {new Date(plan.createdAt).toLocaleDateString("zh-CN")}</span>
                {plan.githubRelease && (
                  <a
                    href={plan.githubRelease.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe size={10} />
                    Release
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ReleasePlanForm
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
