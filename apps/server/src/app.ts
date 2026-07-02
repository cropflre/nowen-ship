import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env, isDev } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./db/client.js";
import { projectRoutes } from "./routes/projects.js";
import { buildRoutes } from "./routes/builds.js";
import { releaseRoutes } from "./routes/releases.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: isDev
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: isDev ? ["http://localhost:5173"] : [],
    credentials: true,
  });

  await app.register(sensible);

  // Health check
  app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Register API routes
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(buildRoutes, { prefix: "/api/builds" });
  await app.register(releaseRoutes, { prefix: "/api/releases" });

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      error: "Not Found",
      message: `Cannot ${request.method} ${request.url}`,
    });
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error({ err: error, url: request.url }, "Request error");
    reply.status(error.statusCode ?? 500).send({
      error: error.name,
      message: error.message,
    });
  });

  return app;
}
