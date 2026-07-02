import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ProjectService } from "../services/project.service.js";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema.js";
import { prisma } from "../db/client.js";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  const projectService = new ProjectService(prisma);

  // GET /api/projects
  app.get("/", async (request, reply) => {
    const projects = await projectService.findAll();
    return { data: projects };
  });

  // GET /api/projects/:id
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectService.findById(id);
    if (!project) {
      return reply.status(404).send({ error: "项目不存在" });
    }
    return { data: project };
  });

  // POST /api/projects
  app.post("/", async (request, reply) => {
    const parseResult = createProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const project = await projectService.create(parseResult.data);
      return reply.status(201).send({ data: project });
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      return reply.status(400).send({ error: message });
    }
  });

  // PUT /api/projects/:id
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "参数校验失败",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const project = await projectService.update(id, parseResult.data);
      return { data: project };
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  // DELETE /api/projects/:id
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await projectService.remove(id);
      return reply.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      const status = message.includes("不存在") ? 404 : 400;
      return reply.status(status).send({ error: message });
    }
  });
};
