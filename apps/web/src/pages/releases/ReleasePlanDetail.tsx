import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Tag, Rocket, FileText, Globe, CheckCircle } from "lucide-react";
import { useReleasePlan, useCreateTag, useTriggerBuildForPlan, useCreateGitHubRelease, usePublishGitHubRelease } from "../../api/releases";
import { useBuild } from "../../api/builds";
import type { ReleasePlan } from "../../types/release";

const statusLabels: Record<string, string> = {
  draft: "草稿",
  pending: "待构建",
  building: "构建中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

export function ReleasePlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, refetch } = useReleasePlan(id!);

  const createTag = useCreateTag();
  const triggerBuild = useTriggerBuildForPlan();
  const createRelease = useCreateGitHubRelease();
  const publishRelease = usePublishGitHubRelease();

  const handleAction = async (action: string) => {
    if (!plan) return;
    try {
      switch (action) {
        case "tag":
          await createTag.mutateAsync(plan.id);
          alert(`Tag ${plan.tagName} 创建成功！`);
          break;
        case "build":
          await triggerBuild.mutateAsync(plan.id);
          alert("构建已触发！请在「构建任务」页面查看进度。");
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

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">加载中…</div>;
  }

  if (!plan) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        发版计划不存在。
        <Link to="/releases" className="ml-2 text-primary hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  const timeline = [
    {
      step: 1,
      label: "创建发版计划",
      done: true,
      time: plan.createdAt,
    },
    {
      step: 2,
      label: `创建 Tag ${plan.tagName}`,
      done: !!plan.sourceCommitSha,
      action: "tag",
    },
    {
      step: 3,
      label: "触发构建",
      done: (plan.releaseJobs ?? []).length > 0,
      action: "build",
    },
    {
      step: 4,
      label: "构建完成 & 同步产物",
      done: plan.releaseJobs?.some((j: { status: string }) => j.status === "success") ?? false,
    },
    {
      step: 5,
      label: "创建 GitHub Release Draft",
      done: !!plan.githubRelease,
      action: plan.githubRelease ? undefined : "draft",
    },
    {
      step: 6,
      label: "发布 Release",
      done: plan.githubRelease ? !plan.githubRelease.draft : false,
      action: plan.githubRelease && plan.githubRelease.draft ? "publish" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/releases" className="rounded p-1 hover:bg-accent">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h3 className="text-2xl font-bold">{plan.tagName}</h3>
          <p className="text-muted-foreground">
            {plan.project.name} · {plan.releaseType} · 创建于 {new Date(plan.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            plan.status === "success"
              ? "bg-green-100 text-green-700"
              : plan.status === "failed"
              ? "bg-red-100 text-red-700"
              : plan.status === "building"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {statusLabels[plan.status] ?? plan.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 左侧：时间线 */}
        <div className="md:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <h4 className="mb-4 font-semibold">发版流程</h4>
            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  {/* 步骤图标 */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      item.done
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.done ? <CheckCircle size={16} /> : item.step}
                  </div>

                  {/* 步骤内容 */}
                  <div className="flex-1 pt-0.5">
                    <div className="font-medium text-sm">{item.label}</div>
                    {item.time && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.time).toLocaleString("zh-CN")}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  {item.action && !item.done && (
                    <button
                      onClick={() => handleAction(item.action!)}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {item.action === "tag" && <><Tag size={10} className="mr-1 inline" />创建 Tag</>}
                      {item.action === "build" && <><Rocket size={10} className="mr-1 inline" />触发构建</>}
                      {item.action === "draft" && <><FileText size={10} className="mr-1 inline" />创建 Draft</>}
                      {item.action === "publish" && <><Globe size={10} className="mr-1 inline" />发布</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：信息卡片 */}
        <div className="space-y-4">
          {/* Changelog */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="mb-2 font-semibold">Changelog</h4>
            {plan.changelog ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{plan.changelog}</p>
            ) : (
              <p className="text-sm text-muted-foreground">暂无 changelog</p>
            )}
          </div>

          {/* 构建任务 */}
          {plan.releaseJobs && plan.releaseJobs.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="mb-2 font-semibold">构建任务</h4>
              <div className="space-y-2">
                {plan.releaseJobs.map((job: { id: string; githubRunId: number; githubRunUrl: string; status: string; conclusion: string | null }) => (
                  <Link
                    key={job.id}
                    to={`/builds/${job.id}`}
                    className="flex items-center justify-between rounded p-2 text-sm hover:bg-accent"
                  >
                    <span>Run #{job.githubRunId}</span>
                    <span className="text-muted-foreground">{statusLabels[job.status] ?? job.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Release */}
          {plan.githubRelease && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="mb-2 font-semibold">GitHub Release</h4>
              <a
                href={plan.githubRelease.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {plan.githubRelease.draft ? "Draft" : "Published"}
                <ExternalLink size={10} />
              </a>
              {plan.githubRelease.publishedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  发布于 {new Date(plan.githubRelease.publishedAt).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
