import { FastifyPluginAsync } from "fastify";
import { DeployService } from "../services/deploy.service.js";
import { GitHubService } from "../services/github.service.js";
import {
  createDeployTargetSchema,
  updateDeployTargetSchema,
  triggerDeploymentSchema,
} from "../schemas/deploy.schema.js";
import { prisma } from "../db/client.js";

export const deployRoutes: FastifyPluginAsync = async (app) => {
  const github = new GitHubService();
  const deployService = new DeployService(prisma, github);

  // ===== 部署目标 =====
  // GET /api/deploy/targets
  app.get("/targets", async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const targets = await deployService.listDeployTargets(projectId);
    return { data: targets };
  });

  // POST /api/deploy/targets
  app.post("/targets", async (request, reply) => {
    const parseResult = createDeployTargetSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    try {
      const target = await deployService.createDeployTarget(parseResult.data);
      return reply.status(201).send({ data: target });
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建部署目标失败";
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/deploy/targets/:id
  app.get("/targets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const target = await deployService.getDeployTarget(id);
      return { data: target };
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // PUT /api/deploy/targets/:id
  app.put("/targets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateDeployTargetSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    try {
      const target = await deployService.updateDeployTarget(id, parseResult.data);
      return { data: target };
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // DELETE /api/deploy/targets/:id
  app.delete("/targets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await deployService.removeDeployTarget(id);
      return reply.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // ===== 部署记录 =====
  // GET /api/deploy/deployments
  app.get("/deployments", async (request) => {
    const { projectId, status } = request.query as {
      projectId?: string;
      status?: string;
    };
    const deployments = await deployService.listDeployments({ projectId, status });
    return { data: deployments };
  });

  // POST /api/deploy/deployments — 触发部署
  app.post("/deployments", async (request, reply) => {
    const parseResult = triggerDeploymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    try {
      const deployment = await deployService.triggerDeployment({
        ...parseResult.data,
        triggeredBy: parseResult.data.triggeredBy ?? "admin",
      });
      return reply.status(201).send({ data: deployment });
    } catch (err) {
      const message = err instanceof Error ? err.message : "触发部署失败";
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/deploy/deployments/:id
  app.get("/deployments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const deployment = await deployService.getDeployment(id);
      return { data: deployment };
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // POST /api/deploy/deployments/:id/sync — 同步状态
  app.post("/deployments/:id/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const deployment = await deployService.syncDeployment(id);
      return { data: deployment };
    } catch (err) {
      const message = err instanceof Error ? err.message : "同步失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });
};
