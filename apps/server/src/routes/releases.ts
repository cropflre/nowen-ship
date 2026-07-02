import { FastifyPluginAsync } from "fastify";
import { ReleaseService } from "../services/release.service.js";
import { GitHubService } from "../services/github.service.js";
import { createReleasePlanSchema } from "../schemas/release.schema.js";
import { prisma } from "../db/client.js";

export const releaseRoutes: FastifyPluginAsync = async (app) => {
  const github = new GitHubService();
  const releaseService = new ReleaseService(prisma, github);

  // GET /api/releases/plans — 列表
  app.get("/plans", async (request) => {
    const { projectId, status } = request.query as {
      projectId?: string;
      status?: string;
    };
    const plans = await releaseService.listPlans({ projectId, status });
    return { data: plans };
  });

  // GET /api/releases/plans/:id — 详情
  app.get("/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const plan = await releaseService.getPlan(id);
      return { data: plan };
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // POST /api/releases/plans — 创建发版计划
  app.post("/plans", async (request, reply) => {
    const parseResult = createReleasePlanSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const plan = await releaseService.createPlan({
        ...parseResult.data,
        createdBy: "admin", // Phase 1: 硬编码，Phase 7 接入认证后改
      });
      return reply.status(201).send({ data: plan });
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/releases/plans/:id/create-tag — 创建 Git tag
  app.post("/plans/:id/create-tag", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const sha = await releaseService.createTag(id);
      return { data: { sha, message: "Tag 创建成功" } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建 tag 失败";
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/releases/plans/:id/trigger-build — 触发构建
  app.post("/plans/:id/trigger-build", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ref } = request.body as { ref?: string };
    try {
      const jobId = await releaseService.triggerBuild(id, ref);
      return { data: { jobId, message: "构建已触发" } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "触发构建失败";
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/releases/plans/:id/create-github-release — 创建 GitHub Release draft
  app.post("/plans/:id/create-github-release", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await releaseService.createGitHubRelease(id);
      return { data: result, message: "GitHub Release draft 已创建" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建 Release 失败";
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/releases/plans/:id/publish-github-release — 发布 Release
  app.post("/plans/:id/publish-github-release", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await releaseService.publishGitHubRelease(id);
      return { data: { message: "Release 已发布" } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "发布失败";
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/releases/plans/:id/calculate-version — 预览目标版本号（不创建）
  app.get("/plans/:id/calculate-version", async (request, reply) => {
    const { projectId, releaseType } = request.query as {
      projectId: string;
      releaseType: "patch" | "minor" | "major" | "prerelease";
    };
    if (!projectId || !releaseType) {
      return reply.status(400).send({ error: "projectId 和 releaseType 不能为空" });
    }
    try {
      const version = await releaseService.calculateTargetVersion(projectId, releaseType);
      return { data: { version, tagName: `v${version}` } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "计算版本号失败";
      return reply.status(400).send({ error: message });
    }
  });
};
