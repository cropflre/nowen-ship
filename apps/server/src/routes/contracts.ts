import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { releaseContractSchemaMetadata } from "../contracts/release-contract.schema.js";
import { prisma } from "../db/client.js";
import { GitHubRepositoryService } from "../services/github-repository.service.js";
import { ReleaseContractService } from "../services/release-contract.service.js";
import { toJsonSafe } from "../utils/json-safe.js";

const validateBodySchema = z.object({
  content: z.string().min(1, "content 不能为空"),
});

const syncBodySchema = z
  .object({
    ref: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
  })
  .default({});

export const contractRoutes: FastifyPluginAsync = async (app) => {
  const repositoryService = new GitHubRepositoryService();
  const contractService = new ReleaseContractService(prisma, repositoryService);

  app.get("/schema", async () => ({
    data: releaseContractSchemaMetadata,
  }));

  app.post("/validate", async (request, reply) => {
    const body = validateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: body.error.flatten().fieldErrors,
      });
    }

    const result = contractService.validateContent(body.data.content);
    return reply.status(result.valid ? 200 : 422).send({ data: result });
  });

  app.post("/projects/:id/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = syncBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: body.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await contractService.syncProjectContract(id, body.data);
      return reply.status(result.valid ? 200 : 422).send({ data: toJsonSafe(result) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步发布契约失败";
      return reply.status(message.includes("不存在") ? 404 : 400).send({ error: message });
    }
  });

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { checkRemote } = request.query as { checkRemote?: string };

    try {
      const result = await contractService.getContractStatus(
        id,
        checkRemote === "true" || checkRemote === "1"
      );
      return { data: toJsonSafe(result) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取发布契约失败";
      return reply.status(message.includes("不存在") ? 404 : 400).send({ error: message });
    }
  });

  app.get("/projects/:id/channels/:channelKey/form", async (request, reply) => {
    const { id, channelKey } = request.params as {
      id: string;
      channelKey: string;
    };

    try {
      const form = await contractService.getInputForm(id, channelKey);
      return { data: form };
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取动态表单失败";
      return reply.status(message.includes("不存在") ? 404 : 400).send({ error: message });
    }
  });
};
