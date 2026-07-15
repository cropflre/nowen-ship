import { createHash } from "node:crypto";
import { parse } from "yaml";
import {
  CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION,
  releaseContractSchema,
  type ReleaseContract,
} from "./release-contract.schema.js";

export interface ContractValidationIssue {
  path: string;
  message: string;
  code: string;
}

export interface ContractValidationResult {
  valid: boolean;
  contract?: ReleaseContract;
  contentHash: string;
  warnings: string[];
  errors: ContractValidationIssue[];
}

export function hashReleaseContract(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function normalizeSchemaVersion(value: unknown): {
  value: unknown;
  warnings: string[];
  error?: ContractValidationIssue;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      value,
      warnings: [],
      error: {
        path: "",
        code: "invalid_root",
        message: "发布契约根节点必须是对象",
      },
    };
  }

  const record = { ...(value as Record<string, unknown>) };
  if (record.schemaVersion === undefined) {
    record.schemaVersion = CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION;
    return {
      value: record,
      warnings: [
        `未声明 schemaVersion，当前按 v${CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION} 解析；请显式补充版本号`,
      ],
    };
  }

  if (typeof record.schemaVersion !== "number" || !Number.isInteger(record.schemaVersion)) {
    return {
      value: record,
      warnings: [],
      error: {
        path: "schemaVersion",
        code: "invalid_schema_version",
        message: "schemaVersion 必须是整数",
      },
    };
  }

  if (record.schemaVersion > CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION) {
    return {
      value: record,
      warnings: [],
      error: {
        path: "schemaVersion",
        code: "unsupported_future_schema",
        message: `当前只支持 schemaVersion ${CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION}，仓库配置版本过新`,
      },
    };
  }

  if (record.schemaVersion < CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION) {
    return {
      value: record,
      warnings: [],
      error: {
        path: "schemaVersion",
        code: "unsupported_legacy_schema",
        message: `schemaVersion ${record.schemaVersion} 暂无迁移器，请升级到 ${CURRENT_RELEASE_CONTRACT_SCHEMA_VERSION}`,
      },
    };
  }

  return { value: record, warnings: [] };
}

export function validateReleaseContractContent(content: string): ContractValidationResult {
  const contentHash = hashReleaseContract(content);
  let parsed: unknown;

  try {
    parsed = parse(content, {
      prettyErrors: true,
      strict: true,
      uniqueKeys: true,
    });
  } catch (error) {
    return {
      valid: false,
      contentHash,
      warnings: [],
      errors: [
        {
          path: "",
          code: "yaml_parse_error",
          message: error instanceof Error ? error.message : "YAML 解析失败",
        },
      ],
    };
  }

  const normalized = normalizeSchemaVersion(parsed);
  if (normalized.error) {
    return {
      valid: false,
      contentHash,
      warnings: normalized.warnings,
      errors: [normalized.error],
    };
  }

  const validation = releaseContractSchema.safeParse(normalized.value);
  if (!validation.success) {
    return {
      valid: false,
      contentHash,
      warnings: normalized.warnings,
      errors: validation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    };
  }

  return {
    valid: true,
    contract: validation.data,
    contentHash,
    warnings: normalized.warnings,
    errors: [],
  };
}
