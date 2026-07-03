import { PrismaClient } from "@prisma/client";
import { GitHubService } from "./github.service.js";
import { prisma } from "../db/client.js";
import { logger } from "../utils/logger.js";

type DeployInput = {
  projectId: string;
  deployTargetId: string;
  releasePlanId?: string;
  version: string;
  commitSha?: string;
  triggeredBy: string;
  inputs?: Record<string, string>;
};

export class DeployService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubService
  ) {}

  // ============ 部署目标 ============

  async listDeployTargets(projectId?: string) {
    return this.prisma.deployTarget.findMany({
      where: projectId ? { projectId } : {},
      include: { project: { select: { id: true, name: true, repoFullName: true } } },
      orderBy: [{ environment: "asc" }, { createdAt: "desc" }],
    });
  }

  async getDeployTarget(id: string) {
    const target = await this.prisma.deployTarget.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, repoFullName: true } },
        deployments: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!target) throw new Error("部署目标不存在");
    return target;
  }

  async createDeployTarget(input: {
    projectId: string;
    name: string;
    environment: string;
    type: string;
    config?: Record<string, unknown> | null;
    isActive?: boolean;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) throw new Error("项目不存在");

    return this.prisma.deployTarget.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        environment: input.environment,
        type: input.type,
        config: (input.config as object) ?? undefined,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateDeployTarget(
    id: string,
    input: Partial<{
      name: string;
      environment: string;
      type: string;
      config: Record<string, unknown> | null;
      isActive: boolean;
    }>
  ) {
    const existing = await this.prisma.deployTarget.findUnique({ where: { id } });
    if (!existing) throw new Error("部署目标不存在");

    return this.prisma.deployTarget.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.environment !== undefined ? { environment: input.environment } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.config !== undefined ? { config: input.config as object } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async removeDeployTarget(id: string) {
    const existing = await this.prisma.deployTarget.findUnique({ where: { id } });
    if (!existing) throw new Error("部署目标不存在");

    const count = await this.prisma.deployment.count({ where: { deployTargetId: id } });
    if (count > 0) {
      throw new Error("该部署目标已有部署记录，无法删除。请先清理相关部署记录。");
    }

    return this.prisma.deployTarget.delete({ where: { id } });
  }

  // ============ 部署记录 ============

  async listDeployments(params: { projectId?: string; status?: string } = {}) {
    return this.prisma.deployment.findMany({
      where: {
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: {
        project: { select: { id: true, name: true, repoFullName: true } },
        deployTarget: { select: { id: true, name: true, environment: true } },
        releasePlan: { select: { id: true, version: true, tagName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDeployment(id: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, repoFullName: true } },
        deployTarget: true,
        releasePlan: { select: { id: true, version: true, tagName: true } },
      },
    });
    if (!deployment) throw new Error("部署记录不存在");
    return deployment;
  }

  /**
   * 触发部署：调用 GitHub workflow_dispatch，并创建 deployment 记录
   */
  async triggerDeployment(input: DeployInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) throw new Error("项目不存在");

    const target = await this.prisma.deployTarget.findUnique({
      where: { id: input.deployTargetId },
    });
    if (!target) throw new Error("部署目标不存在");
    if (!target.isActive) throw new Error("部署目标已停用，无法触发");

    if (input.releasePlanId) {
      const plan = await this.prisma.releasePlan.findUnique({
        where: { id: input.releasePlanId },
      });
      if (!plan) throw new Error("关联的发版计划不存在");
    }

    const [owner, repo] = project.repoFullName.split("/");

    // 触发部署 workflow（复用项目的 workflowFile）
    const { runId } = await this.github.triggerWorkflow({
      owner,
      repo,
      workflowId: project.workflowFile,
      ref: project.defaultBranch,
      inputs: {
        version: input.version,
        environment: target.environment,
        target: target.name,
        ...(input.commitSha ? { sha: input.commitSha } : {}),
        ...(input.inputs ?? {}),
      },
    });

    // 等待 GitHub 处理
    await new Promise((r) => setTimeout(r, 2000));
    const run = await this.github.getWorkflowRun(owner, repo, runId);

    const deployment = await this.prisma.deployment.create({
      data: {
        projectId: input.projectId,
        releasePlanId: input.releasePlanId,
        deployTargetId: input.deployTargetId,
        version: input.version,
        commitSha: input.commitSha,
        status: this.mapStatus(run.status),
        githubRunId: BigInt(run.id),
        githubRunUrl: run.html_url,
        triggeredBy: input.triggeredBy,
        startedAt: run.created_at ? new Date(run.created_at) : null,
        logs: `由 ${input.triggeredBy} 触发部署到 ${target.environment} 环境\n`,
      },
      include: {
        project: { select: { id: true, name: true, repoFullName: true } },
        deployTarget: { select: { id: true, name: true, environment: true } },
      },
    });

    await this.writeAuditLog(
      input.triggeredBy,
      "deployment.trigger",
      "deployment",
      deployment.id,
      `触发部署 ${deployment.version} 到 ${target.environment} 环境 (${target.name})`
    );

    logger.info(
      { deploymentId: deployment.id, runId, project: project.repoFullName },
      "Deployment triggered"
    );
    return deployment;
  }

  /**
   * 同步单个部署记录状态
   */
  async syncDeployment(id: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      include: { deployTarget: true, project: true },
    });
    if (!deployment) throw new Error("部署记录不存在");
    if (!deployment.githubRunId) throw new Error("该部署记录没有关联 GitHub Run");

    const [owner, repo] = deployment.project.repoFullName.split("/");
    const run = await this.github.getWorkflowRun(owner, repo, Number(deployment.githubRunId));

    const prevStatus = deployment.status;
    const nextStatus = this.mapStatus(run.status);

    const updated = await this.prisma.deployment.update({
      where: { id },
      data: {
        status: nextStatus,
        startedAt: run.created_at ? new Date(run.created_at) : deployment.startedAt,
        completedAt: run.updated_at ? new Date(run.updated_at) : null,
        logs: this.appendLog(
          deployment.logs,
          `同步状态: ${prevStatus} -> ${nextStatus}${
            run.conclusion ? ` (${run.conclusion})` : ""
          }`
        ),
      },
    });

    // 完成时写审计日志
    if (prevStatus !== nextStatus && (nextStatus === "success" || nextStatus === "failed")) {
      await this.writeAuditLog(
        deployment.triggeredBy,
        nextStatus === "success" ? "deployment.success" : "deployment.failed",
        "deployment",
        id,
        `部署 ${deployment.version} 到 ${deployment.deployTarget.environment} 环境结果：${nextStatus}`
      );
    }

    return updated;
  }

  // ============ 工具 ============

  private appendLog(existing: string | null, line: string): string {
    const ts = new Date().toISOString();
    return `${existing ?? ""}[${ts}] ${line}\n`;
  }

  private async writeAuditLog(
    actor: string,
    action: string,
    targetType: string,
    targetId: string,
    detail: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { actor, action, targetType, targetId, detail },
      });
    } catch (err) {
      logger.warn({ err, action, targetId }, "写入审计日志失败");
    }
  }

  private mapStatus(status: string): string {
    const map: Record<string, string> = {
      queued: "queued",
      waiting: "queued",
      pending: "queued",
      in_progress: "in_progress",
      completed: "success",
      success: "success",
      failure: "failed",
      cancelled: "cancelled",
    };
    return map[status] ?? status;
  }
}
