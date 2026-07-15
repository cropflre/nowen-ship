import { PrismaClient } from "@prisma/client";
import { GitHubService } from "./github.service.js";
import { bumpVersion, toTagName } from "../utils/version.js";
import { logger } from "../utils/logger.js";

export class ReleaseService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubService
  ) {}

  /**
   * 获取项目的当前版本号（优先读 package.json，fallback 到上次 release）
   */
  async getCurrentVersion(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new Error("项目不存在");

    const [owner, repo] = project.repoFullName.split("/");

    const pkg = await this.github.getPackageJson(owner, repo, project.defaultBranch);
    if (pkg && typeof pkg === "object" && "version" in pkg) {
      return (pkg as { version: string }).version;
    }

    const latest = await this.github.getLatestRelease(owner, repo);
    if (latest) {
      return latest.tag_name.replace(/^v/, "");
    }

    return "0.0.0";
  }

  async calculateTargetVersion(
    projectId: string,
    releaseType: "patch" | "minor" | "major" | "prerelease",
    prereleaseTag?: string
  ): Promise<string> {
    const current = await this.getCurrentVersion(projectId);
    return bumpVersion(current, releaseType, prereleaseTag);
  }

  async createPlan(params: {
    projectId: string;
    releaseType: "patch" | "minor" | "major" | "prerelease";
    sourceBranch: string;
    changelog: string;
    createdBy: string;
    prereleaseTag?: string;
  }) {
    const targetVersion = await this.calculateTargetVersion(
      params.projectId,
      params.releaseType,
      params.prereleaseTag
    );
    const tagName = toTagName(targetVersion);

    const existing = await this.prisma.releasePlan.findUnique({
      where: {
        projectId_tagName: {
          projectId: params.projectId,
          tagName,
        },
      },
    });
    if (existing) {
      throw new Error(`项目内发版计划 ${tagName} 已存在`);
    }

    const plan = await this.prisma.releasePlan.create({
      data: {
        projectId: params.projectId,
        version: targetVersion,
        tagName,
        sourceBranch: params.sourceBranch,
        releaseType: params.releaseType,
        changelog: params.changelog,
        status: "draft",
        createdBy: params.createdBy,
      },
      include: { project: true },
    });

    logger.info({ planId: plan.id, tagName }, "Release plan created");
    return plan;
  }

  async listPlans(params: { projectId?: string; status?: string } = {}) {
    return this.prisma.releasePlan.findMany({
      where: {
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: { project: true, releaseJobs: true, githubRelease: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id },
      include: {
        project: true,
        releaseJobs: { include: { artifacts: true } },
        githubRelease: true,
      },
    });
    if (!plan) throw new Error("发版计划不存在");
    return plan;
  }

  async createTag(planId: string, commitSha?: string): Promise<string> {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id: planId },
      include: { project: true },
    });
    if (!plan) throw new Error("发版计划不存在");

    const [owner, repo] = plan.project.repoFullName.split("/");

    if (!commitSha) {
      const { data: refData } = await this.github["octokit"].rest.git.getRef({
        owner,
        repo,
        ref: `heads/${plan.sourceBranch}`,
      });
      commitSha = refData.object.sha;
    }

    await this.prisma.releasePlan.update({
      where: { id: planId },
      data: { sourceCommitSha: commitSha },
    });

    await this.github.createTag(owner, repo, plan.tagName, commitSha);
    return commitSha;
  }

  async triggerBuild(planId: string, ref?: string): Promise<string> {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id: planId },
      include: { project: true },
    });
    if (!plan) throw new Error("发版计划不存在");

    await this.prisma.releasePlan.update({
      where: { id: planId },
      data: { status: "building" },
    });

    const [owner, repo] = plan.project.repoFullName.split("/");
    const { runId } = await this.github.triggerWorkflow({
      owner,
      repo,
      workflowId: plan.project.workflowFile,
      ref: ref ?? plan.sourceBranch,
      inputs: {
        version: plan.version,
        tag: plan.tagName,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const run = await this.github.getWorkflowRun(owner, repo, runId);

    const job = await this.prisma.releaseJob.create({
      data: {
        releasePlanId: planId,
        projectId: plan.project.id,
        githubRunId: BigInt(run.id),
        githubRunUrl: run.html_url,
        workflowFile: plan.project.workflowFile,
        status: "queued",
        startedAt: run.created_at ? new Date(run.created_at) : null,
      },
    });

    return job.id;
  }

  async createGitHubRelease(planId: string): Promise<{ id: number; htmlUrl: string }> {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id: planId },
      include: { project: true, githubRelease: true },
    });
    if (!plan) throw new Error("发版计划不存在");
    if (plan.githubRelease) throw new Error("该计划已有关联的 GitHub Release");

    const [owner, repo] = plan.project.repoFullName.split("/");
    const { id, html_url } = await this.github.createRelease({
      owner,
      repo,
      tagName: plan.tagName,
      name: `${plan.project.name} ${plan.tagName}`,
      body: plan.changelog || `Release ${plan.tagName}`,
      draft: true,
      prerelease: plan.releaseType === "prerelease",
    });

    await this.prisma.githubRelease.create({
      data: {
        releasePlanId: planId,
        projectId: plan.project.id,
        githubReleaseId: id,
        tagName: plan.tagName,
        name: `${plan.project.name} ${plan.tagName}`,
        body: plan.changelog,
        draft: true,
        prerelease: plan.releaseType === "prerelease",
        htmlUrl: html_url,
      },
    });

    return { id, htmlUrl: html_url };
  }

  async publishGitHubRelease(planId: string): Promise<void> {
    const plan = await this.prisma.releasePlan.findUnique({
      where: { id: planId },
      include: { githubRelease: true, project: true },
    });
    if (!plan) throw new Error("发版计划不存在");
    if (!plan.githubRelease) throw new Error("该计划还没有创建 GitHub Release");
    if (!plan.githubRelease.draft) throw new Error("该 Release 已发布");

    const [owner, repo] = plan.project.repoFullName.split("/");
    await this.github.publishRelease(owner, repo, plan.githubRelease.githubReleaseId);

    await this.prisma.githubRelease.update({
      where: { id: plan.githubRelease.id },
      data: { draft: false, publishedAt: new Date() },
    });

    await this.prisma.releasePlan.update({
      where: { id: planId },
      data: { status: "success" },
    });
  }
}
