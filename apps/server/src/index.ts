import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Shutting down nowen-ship server");

    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, "Graceful shutdown failed");
      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    app.log.info(`API available at http://${env.HOST}:${env.PORT}/api`);
  } catch (error) {
    app.log.error(error);
    await app.close();
    process.exit(1);
  }
}

void main();
