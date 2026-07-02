import { z } from "zod";

export const releaseTypeSchema = z.enum(["patch", "minor", "major", "prerelease"]);

export const createReleasePlanSchema = z.object({
  projectId: z.string().min(1, "项目不能为空"),
  releaseType: releaseTypeSchema,
  sourceBranch: z.string().min(1, "分支不能为空").default("main"),
  changelog: z.string().default(""),
  prereleaseTag: z.string().optional(), // beta, alpha, rc
});

export const updateReleasePlanSchema = z.object({
  changelog: z.string().optional(),
  sourceBranch: z.string().optional(),
  status: z.enum(["draft", "pending", "building", "success", "failed", "cancelled"]).optional(),
});

export const releaseStatusLabels: Record<string, string> = {
  draft: "草稿",
  pending: "待构建",
  building: "构建中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};
