import { PrismaClient } from "@prisma/client";
import { GitHubService } from "./github.service.js";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";

export class BuildService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubService
  ) {}

  /**
   * 触发构建：调用 GitHub API + 创建 release_jobs 记录
   */
  async triggerBuild(params: {
    projectId: string;
    releasePlanId?: string;
    ref?: string;
    inputs?: Record<string, string>;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
    });
    if (!project) throw new Error("项目不存在");

    const [owner, repo] = project.repoFullName.split("/");
    const ref = params.ref ?? project.defaultBranch;

    // 调用 GitHub API 触发 workflow
    const { runId } = await this.github.triggerWorkflow({
      owner,
      repo,
      workflowId: project.workflowFile,
      ref,
      inputs: params.inputs,
    });

    // 等待一下让 GitHub 处理
    await new Promise((r) => setTimeout(r, 2000));

    // 获取 run 详情
    const run = await this.github.getWorkflowRun(owner, repo, runId);

    // 创建 release_jobs 记录
    const job = await this.prisma.releaseJob.create({
      data: {
        releasePlanId: params.releasePlanId,
        projectId: project.id,
        githubRunId: BigInt(run.id),
        githubRunUrl: run.html_url,
        workflowFile: project.workflowFile,
        status: this.mapStatus(run.status),
        conclusion: run.conclusion ? this.mapConclusion(run.conclusion) : null,
        startedAt: run.created_at ? new Date(run.created_at) : null,
      },
    });

    logger.info({ jobId: job.id, runId, project: project.repoFullName }, "Build triggered");
    return job;
  }

  /**
   * 同步单个 build job 的状态
   */
  async syncJob(jobId: string) {
    const job = await this.prisma.releaseJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });
    if (!job) throw new Error("构建任务不存在");

    const [owner, repo] = job.project.repoFullName.split("/");

    const run = await this.github.getWorkflowRun(owner, repo, Number(job.githubRunId));

    const updated = await this.prisma.releaseJob.update({
      where: { id: jobId },
      data: {
        status: this.mapStatus(run.status),
        conclusion: run.conclusion ? this.mapConclusion(run.conclusion) : null,
        startedAt: run.created_at ? new Date(run.created_at) : job.startedAt,
        completedAt: run.updated_at ? new Date(run.updated_at) : null,
        rawPayload: run as unknown as Record<string, unknown>,
      },
    });

    return updated;
  }

  /**
   * 列出构建任务
   */
  async listJobs(params: { projectId?: string; status?: string } = {}) {
    return this.prisma.releaseJob.findMany({
      where: {
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 获取单个 job 详情（含 artifacts）
   */
  async getJob(id: string) {
    return this.prisma.releaseJob.findUnique({
      where: { id },
      include: { project: true, artifacts: true, releasePlan: true },
    });
  }

  /**
   * 同步 artifacts 到数据库
   */
  async syncArtifacts(jobId: string) {
    const job = await this.prisma.releaseJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });
    if (!job) throw new Error("构建任务不存在");

    const [owner, repo] = job.project.repoFullName.split("/");
    const artifacts = await this.github.listRunArtifacts(owner, repo, Number(job.githubRunId));

    // 先删除旧的，再写入新的
    await this.prisma.releaseArtifact.deleteMany({ where: { releaseJobId: jobId } });

    const platformMap: Record<string, string> = {
      ".exe": "win",
      ".msi": "win",
      ".dmg": "mac",
      ".AppImage": "linux",
      ".deb": "linux",
      ".rpm": "linux",
      ".zip": "all",
      ".blockmap": "all",
      ".yml": "all",
    };

    for (const artifact of artifacts) {
      // 推断 platform
      let platform = "all";
      const name = artifact.name.toLowerCase();
      if (name.includes("win") || name.includes("windows") || name.endsWith(".exe")) {
        platform = "win";
      } else if (name.includes("mac") || name.includes("darwin") || name.endsWith(".dmg")) {
        platform = "mac";
      } else if (name.includes("linux") || name.includes("appimage") || name.endsWith(".AppImage")) {
        platform = "linux";
      }

      await this.prisma.releaseArtifact.create({
        data: {
          releaseJobId: jobId,
          githubArtifactId: BigInt(artifact.id),
          name: artifact.name,
          sizeBytes: BigInt(artifact.size_in_bytes),
          platform,
          downloadUrl: artifact.archive_download_url,
          expiresAt: new Date(artifact.expires_at),
        },
      });
    }

    return artifacts;
  }

  private mapStatus(status: string): string {
    const map: Record<string, string> = {
      queued: "queued",
      waiting: "queued",
      pending: "queued",
      in_progress: "in_progress",
      completed: "completed",
      success: "success",
      failure: "failed",
      cancelled: "cancelled",
    };
    return map[status] ?? status;
  }

  private mapConclusion(conclusion: string): string {
    const map: Record<string, string> = {
      success: "success",
      failure: "failure",
      cancelled: "cancelled",
      skipped: "skipped",
      timed_out: "timed_out",
    };
    return map[conclusion] ?? conclusion;
  }
}
