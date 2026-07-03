import { z } from "zod";

export const deployTargetTypeEnum = z.enum([
  "server",
  "static",
  "docker",
  "k8s",
  "mobile",
  "desktop",
]);

export const deployEnvironmentEnum = z.enum(["dev", "staging", "prod"]);

export const createDeployTargetSchema = z.object({
  projectId: z.string().min(1, "projectId 不能为空"),
  name: z.string().min(1, "目标名称不能为空").max(100),
  environment: deployEnvironmentEnum,
  type: deployTargetTypeEnum,
  config: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const updateDeployTargetSchema = createDeployTargetSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const triggerDeploymentSchema = z.object({
  projectId: z.string().min(1, "projectId 不能为空"),
  deployTargetId: z.string().min(1, "deployTargetId 不能为空"),
  releasePlanId: z.string().optional(),
  version: z.string().min(1, "版本号不能为空"),
  commitSha: z.string().optional(),
  triggeredBy: z.string().min(1, "操作者不能为空").default("admin"),
  inputs: z.record(z.string()).optional(),
});

export const deployTargetTypeLabels: Record<string, string> = {
  server: "服务器",
  static: "静态资源",
  docker: "Docker",
  k8s: "Kubernetes",
  mobile: "移动端",
  desktop: "桌面端",
};

export const deployEnvironmentLabels: Record<string, string> = {
  dev: "开发",
  staging: "预发",
  prod: "生产",
};
