import { FastifyPluginAsync } from "fastify";
import { BuildService } from "../services/build.service.js";
import { GitHubService } from "../services/github.service.js";
import { prisma } from "../db/client.js";

export const buildRoutes: FastifyPluginAsync = async (app) => {
  const github = new GitHubService();
  const buildService = new BuildService(prisma, github);

  // GET /api/builds — 列表
  app.get("/", async (request) => {
    const { projectId, status } = request.query as {
      projectId?: string;
      status?: string;
    };
    const jobs = await buildService.listJobs({ projectId, status });
    return { data: jobs };
  });

  // GET /api/builds/:id — 详情
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await buildService.getJob(id);
    if (!job) {
      return reply.status(404).send({ error: "构建任务不存在" });
    }
    return { data: job };
  });

  // POST /api/builds — 触发构建
  app.post("/", async (request, reply) => {
    const body = request.body as {
      projectId: string;
      releasePlanId?: string;
      ref?: string;
      inputs?: Record<string, string>;
    };

    if (!body.projectId) {
      return reply.status(400).send({ error: "projectId 不能为空" });
    }

    try {
      const job = await buildService.triggerBuild({
        projectId: body.projectId,
        releasePlanId: body.releasePlanId,
        ref: body.ref,
        inputs: body.inputs,
      });
      return reply.status(201).send({ data: job });
    } catch (err) {
      const message = err instanceof Error ? err.message : "触发构建失败";
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/builds/:id/sync — 同步状态
  app.post("/:id/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const job = await buildService.syncJob(id);
      return { data: job };
    } catch (err) {
      const message = err instanceof Error ? err.message : "同步失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // POST /api/builds/:id/artifacts/sync — 同步 artifacts
  app.post("/:id/artifacts/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const artifacts = await buildService.syncArtifacts(id);
      return { data: artifacts };
    } catch (err) {
      const message = err instanceof Error ? err.message : "同步 artifacts 失败";
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/builds/:id/artifacts — 查看 artifacts
  app.get("/:id/artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.releaseJob.findUnique({
      where: { id },
      include: { artifacts: true },
    });
    if (!job) {
      return reply.status(404).send({ error: "构建任务不存在" });
    }
    return { data: job.artifacts };
  });
};
