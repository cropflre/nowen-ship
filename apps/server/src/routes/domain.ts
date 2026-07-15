import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/client.js";
import { DomainService } from "../services/domain.service.js";
import { toJsonSafe } from "../utils/json-safe.js";

export const domainRoutes: FastifyPluginAsync = async (app) => {
  const domainService = new DomainService(prisma);

  app.get("/release-trains/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const train = await domainService.getReleaseTrainGraph(id);
      return { data: toJsonSafe(train) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取 Release Train 失败";
      return reply.status(message.includes("不存在") ? 404 : 400).send({ error: message });
    }
  });

  app.get("/projects/:id/releases", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const project = await domainService.getProjectReleaseGraph(id);
      return { data: toJsonSafe(project) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取项目发布链路失败";
      return reply.status(message.includes("不存在") ? 404 : 400).send({ error: message });
    }
  });
};
