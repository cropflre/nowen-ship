import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useProjects, useDeleteProject } from "../../api/projects";
import { ProjectForm } from "./ProjectForm";
import type { Project } from "../../types/project";

const projectTypeLabels: Record<string, string> = {
  desktop: "桌面端",
  web: "Web 服务",
  mobile: "移动端",
  backend: "后端服务",
  mixed: "混合项目",
};

export function ProjectsList() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, error } = useProjects();
  const deleteProject = useDeleteProject();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除项目「${name}」吗？`)) return;
    try {
      await deleteProject.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProject(null);
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
          <h3 className="text-2xl font-bold">项目管理</h3>
          <p className="text-muted-foreground">管理 Nowen 系列仓库配置</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          新增项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">暂无项目，点击「新增项目」添加。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">项目名称</th>
                <th className="px-4 py-3 text-left font-medium">仓库</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">Workflow</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      to={`/projects/${project.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <a
                      href={`https://github.com/${project.repoFullName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {project.repoFullName}
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {projectTypeLabels[project.projectType] ?? project.projectType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {project.workflowFile}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {project.isActive ? "活跃" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProject(project);
                          setShowForm(true);
                        }}
                        className="rounded p-1 hover:bg-accent"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
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
        <ProjectForm
          project={editingProject}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
