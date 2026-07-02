import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

// Redact sensitive fields from logs
const redactFields = [
  "GITHUB_TOKEN",
  "API_TOKEN",
  "DATABASE_URL",
  "authorization",
  "Authorization",
  "token",
  "password",
  "secret",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: redactFields,
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export default logger;
