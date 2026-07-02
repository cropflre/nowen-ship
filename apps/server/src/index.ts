import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Server listening on http://${env.HOST}:${env.PORT}`);
    app.log.info(`📝 API available at http://${env.HOST}:${env.PORT}/api`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
