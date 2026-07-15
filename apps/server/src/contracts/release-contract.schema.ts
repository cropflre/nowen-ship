import { z } from "zod";

export const CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION = 1 as const;
export const DEFAULT_RELEASE_CONTRACT_PATH = ".nowen/release.yml";

const channelKeyRegex = /^[a-z][a-z0-9-]*$/;
const projectKeyRegex = /^[a-z][a-z0-9-]*$/;
const workflowPathRegex = /^\.github\/workflows\/[A-Za-z0-9._/-]+\.ya?ml$/;
const safeReferenceRegex = /^[A-Za-z0-9._/{}/-]+$/;

export const contractChannelKinds = [
  "desktop",
  "android",
  "ios",
  "docker",
  "server",
  "web",
  "mirror",
  "testflight",
  "other",
] as const;

export const contractTriggerTypes = [
  "tag_push",
  "workflow_dispatch",
  "release_event",
  "script_runner",
] as const;

export const contractInputTypes = ["string", "boolean", "choice", "number"] as const;

const workflowPathSchema = z
  .string()
  .min(1, "Workflow path 不能为空")
  .refine((path) => workflowPathRegex.test(path), {
    message: "Workflow 必须位于 .github/workflows/ 且使用 .yml 或 .yaml 后缀",
  })
  .refine((path) => !path.includes(".."), {
    message: "Workflow path 不能包含父目录跳转",
  });

const versionSourceSchema = z
  .object({
    type: z.enum(["json", "toml", "text", "github_release", "custom"]),
    file: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    pattern: z.string().min(1).optional(),
    adapter: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  })
  .strict()
  .superRefine((source, context) => {
    if (["json", "toml", "text"].includes(source.type) && !source.file) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: `${source.type} 版本来源必须声明 file`,
      });
    }

    if (source.type === "json" && !source.path) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["path"],
        message: "json 版本来源必须声明 path，例如 version",
      });
    }

    if (source.type === "custom" && !source.adapter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adapter"],
        message: "custom 版本来源必须声明 adapter",
      });
    }
  });

const contractInputSchema = z
  .object({
    type: z.enum(contractInputTypes),
    label: z.string().min(1).optional(),
    description: z.string().optional(),
    required: z.boolean().default(false),
    default: z.union([z.string(), z.boolean(), z.number()]).optional(),
    options: z.array(z.string().min(1)).optional(),
    placeholder: z.string().optional(),
    secret: z.boolean().default(false),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.type === "choice") {
      if (!input.options || input.options.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "choice 输入必须提供至少一个 options",
        });
      }
      if (
        input.default !== undefined &&
        (typeof input.default !== "string" || !input.options?.includes(input.default))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["default"],
          message: "choice 默认值必须存在于 options 中",
        });
      }
    } else if (input.options) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "只有 choice 输入可以声明 options",
      });
    }

    if (input.default !== undefined) {
      const validDefault =
        (input.type === "string" && typeof input.default === "string") ||
        (input.type === "choice" && typeof input.default === "string") ||
        (input.type === "boolean" && typeof input.default === "boolean") ||
        (input.type === "number" && typeof input.default === "number");

      if (!validDefault) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["default"],
          message: `默认值类型必须与 ${input.type} 一致`,
        });
      }
    }
  });

const triggerSchema = z
  .object({
    type: z.enum(contractTriggerTypes),
    workflow: workflowPathSchema.optional(),
    ref: z.string().regex(safeReferenceRegex, "ref 包含非法字符").optional(),
    event: z.string().min(1).optional(),
    runner: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
    entrypoint: z.string().regex(/^[A-Za-z0-9._/-]+$/).optional(),
  })
  .strict()
  .superRefine((trigger, context) => {
    if (trigger.type === "script_runner") {
      if (!trigger.runner) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["runner"],
          message: "script_runner 必须声明受控 runner",
        });
      }
      if (!trigger.entrypoint) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entrypoint"],
          message: "script_runner 必须声明受控 entrypoint",
        });
      }
      if (trigger.workflow) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["workflow"],
          message: "script_runner 不能同时声明 workflow",
        });
      }
    } else if (!trigger.workflow) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workflow"],
        message: `${trigger.type} 必须声明 workflow`,
      });
    }
  });

const artifactRuleSchema = z
  .object({
    name: z.string().min(1).optional(),
    pattern: z.string().min(1, "产物 pattern 不能为空"),
    platform: z
      .enum(["windows", "macos", "linux", "android", "ios", "web", "server", "all"])
      .default("all"),
    architecture: z.string().min(1).default("all"),
    kind: z.string().min(1).optional(),
    required: z.boolean().default(true),
    retentionDays: z.number().int().positive().max(400).optional(),
  })
  .strict();

const publishPolicySchema = z
  .object({
    mode: z.enum(["automatic", "manual", "draft"]).default("manual"),
    prerelease: z.boolean().default(false),
    approval: z.boolean().default(false),
    requiredArtifacts: z.boolean().default(true),
  })
  .strict()
  .default({
    mode: "manual",
    prerelease: false,
    approval: false,
    requiredArtifacts: true,
  });

const productionPolicySchema = z
  .object({
    environment: z.string().min(1).default("production"),
    requiresApproval: z.boolean().default(true),
  })
  .strict()
  .optional();

const releaseChannelSchema = z
  .object({
    name: z.string().min(1).optional(),
    kind: z.enum(contractChannelKinds),
    trigger: triggerSchema,
    inputs: z.record(contractInputSchema).default({}),
    dependsOn: z.array(z.string().min(1)).default([]),
    artifacts: z.array(artifactRuleSchema).default([]),
    publish: publishPolicySchema,
    production: productionPolicySchema,
    optional: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
  })
  .strict();

export const releaseContractSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION),
    project: z
      .object({
        key: z.string().regex(projectKeyRegex, "project.key 必须为小写 kebab-case"),
        name: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
      })
      .strict(),
    version: z
      .object({
        source: versionSourceSchema,
        prefix: z.string().default("v"),
        tagTemplate: z
          .string()
          .min(1)
          .refine((template) => template.includes("{{version}}"), {
            message: "tagTemplate 必须包含 {{version}}",
          }),
      })
      .strict(),
    channels: z.record(releaseChannelSchema),
  })
  .strict()
  .superRefine((contract, context) => {
    const channelEntries = Object.entries(contract.channels);

    if (channelEntries.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channels"],
        message: "至少需要声明一个发布通道",
      });
      return;
    }

    const channelKeys = new Set(channelEntries.map(([key]) => key));
    for (const [key, channel] of channelEntries) {
      if (!channelKeyRegex.test(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channels", key],
          message: "通道 key 必须为小写 kebab-case",
        });
      }

      for (const dependency of channel.dependsOn) {
        if (dependency === key) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channels", key, "dependsOn"],
            message: "通道不能依赖自身",
          });
        } else if (!channelKeys.has(dependency)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channels", key, "dependsOn"],
            message: `依赖的通道 ${dependency} 不存在`,
          });
        }
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const hasCycle = (key: string): boolean => {
      if (visiting.has(key)) return true;
      if (visited.has(key)) return false;

      visiting.add(key);
      for (const dependency of contract.channels[key]?.dependsOn ?? []) {
        if (hasCycle(dependency)) return true;
      }
      visiting.delete(key);
      visited.add(key);
      return false;
    };

    for (const key of channelKeys) {
      if (hasCycle(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channels"],
          message: "发布通道依赖存在循环",
        });
        break;
      }
    }
  });

export type ReleaseContract = z.infer<typeof releaseContractSchema>;
export type ReleaseContractChannel = ReleaseContract["channels"][string];

export const releaseContractSchemaMetadata = {
  schemaVersion: CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION,
  defaultPath: DEFAULT_RELEASE_CONTRACT_PATH,
  channelKinds: contractChannelKinds,
  triggerTypes: contractTriggerTypes,
  inputTypes: contractInputTypes,
  publishModes: ["automatic", "manual", "draft"],
  versionSourceTypes: ["json", "toml", "text", "github_release", "custom"],
};
