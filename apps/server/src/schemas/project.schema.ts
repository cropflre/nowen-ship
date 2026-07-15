import { z } from "zod";

export const repoFullNameRegex = /^[\w.-]+\/[\w.-]+$/;

export const createProjectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空").max(100),
  repoFullName: z
    .string()
    .regex(repoFullNameRegex, "格式必须为 owner/repo，例如 cropflre/nowen-note"),
  defaultBranch: z.string().min(1, "默认分支不能为空").default("main"),
  projectType: z.enum(["desktop", "web", "mobile", "backend", "mixed"], {
    errorMap: () => ({ message: "请选择有效的项目类型" }),
  }),
  workflowFile: z
    .string()
    .min(1, "workflow 文件名不能为空")
    .regex(/\.yml$/, "workflow 文件必须为 .yml 后缀"),
  buildInputsSchema: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const projectTypeLabels: Record<string, string> = {
  desktop: "桌面端",
  web: "Web 服务",
  mobile: "移动端",
  backend: "后端服务",
  mixed: "混合项目",
};
