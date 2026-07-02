import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Zap, GitBranch } from "lucide-react";
import { useProject } from "../../api/projects";
import { useBuilds } from "../../api/builds";
import { useTriggerBuild } from "../../api/builds";

const projectTypeLabels: Record<string, string> = {
  desktop: "桌面端",
  web: "Web 服务",
  mobile: "移动端",
  backend: "后端服务",
  mixed: "混合项目",
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id!);
  const { data: builds = [] } = useBuilds({ projectId: id });
  const triggerBuild = useTriggerBuild();

  const handleTriggerBuild = async () => {
    if (!project) return;
    const ref = prompt("请输入分支名（默认 main）：", project.defaultBranch);
    if (ref === null) return; // 用户取消

    try {
      await triggerBuild.mutateAsync({
        projectId: project.id,
        ref: ref || project.defaultBranch,
      });
      alert("构建已触发！请在「构建任务」页面查看。");
    } catch (err) {
      alert(err instanceof Error ? err.message : "触发构建失败");
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">加载中…</div>;
  }

  if (!project) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        项目不存在。
        <Link to="/projects" className="ml-2 text-primary hover:underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="rounded p-1 hover:bg-accent">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h3 className="text-2xl font-bold">{project.name}</h3>
          <p className="text-muted-foreground">
            {project.repoFullName} · {projectTypeLabels[project.projectType] ?? project.projectType}
          </p>
        </div>
        <button
          onClick={handleTriggerBuild}
          disabled={triggerBuild.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Zap size={14} />
          {triggerBuild.isPending ? "触发中…" : "触发构建"}
        </button>
      </div>

      {/* 项目信息 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 font-semibold">基本信息</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">仓库</dt>
              <dd>
                <a
                  href={`https://github.com/${project.repoFullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  {project.repoFullName}
                  <ExternalLink size={10} />
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">默认分支</dt>
              <dd>{project.defaultBranch}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Workflow 文件</dt>
              <dd>{project.workflowFile}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">状态</dt>
              <dd>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    project.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {project.isActive ? "活跃" : "停用"}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 font-semibold">最近构建</h4>
          {builds.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无构建记录</p>
          ) : (
            <div className="space-y-2">
              {builds.slice(0, 5).map((build) => (
                <Link
                  key={build.id}
                  to={`/builds/${build.id}`}
                  className="flex items-center justify-between rounded p-2 text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <GitBranch size={12} />
                    Run #{build.githubRunId}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(build.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
