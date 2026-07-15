import {
  ChannelKind,
  Prisma,
  type PrismaClient,
  TriggerType,
} from "@prisma/client";
import {
  DEFAULT_RELEASE_CONTRACT_PATH,
  type ReleaseContract,
  type ReleaseContractChannel,
} from "../contracts/release-contract.schema.js";
import {
  hashReleaseContract,
  validateReleaseContractContent,
  type ContractValidationResult,
} from "../contracts/release-contract.parser.js";
import type {
  RepositoryFileReader,
  RepositoryFileResult,
} from "./github-repository.service.js";

interface ContractCacheRow {
  project_id: string;
  schema_version: number;
  source_path: string;
  source_ref: string;
  source_commit_sha: string | null;
  source_blob_sha: string | null;
  content_hash: string;
  raw_content: string;
  parsed_config: unknown;
  validation_errors: unknown;
  warnings: unknown;
  status: string;
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ContractCache {
  projectId: string;
  schemaVersion: number;
  sourcePath: string;
  sourceRef: string;
  sourceCommitSha: string | null;
  sourceBlobSha: string | null;
  contentHash: string;
  rawContent: string;
  parsedConfig: unknown;
  validationErrors: unknown;
  warnings: unknown;
  status: string;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const channelKindMap: Record<ReleaseContractChannel["kind"], ChannelKind> = {
  desktop: ChannelKind.DESKTOP,
  android: ChannelKind.ANDROID,
  ios: ChannelKind.IOS,
  docker: ChannelKind.DOCKER,
  server: ChannelKind.SERVER,
  web: ChannelKind.WEB,
  mirror: ChannelKind.MIRROR,
  testflight: ChannelKind.TESTFLIGHT,
  other: ChannelKind.OTHER,
};

const triggerTypeMap: Record<ReleaseContractChannel["trigger"]["type"], TriggerType> = {
  tag_push: TriggerType.TAG_PUSH,
  workflow_dispatch: TriggerType.WORKFLOW_DISPATCH,
  release_event: TriggerType.RELEASE_EVENT,
  script_runner: TriggerType.SCRIPT_RUNNER,
};

function mapCacheRow(row: ContractCacheRow): ContractCache {
  return {
    projectId: row.project_id,
    schemaVersion: row.schema_version,
    sourcePath: row.source_path,
    sourceRef: row.source_ref,
    sourceCommitSha: row.source_commit_sha,
    sourceBlobSha: row.source_blob_sha,
    contentHash: row.content_hash,
    rawContent: row.raw_content,
    parsedConfig: row.parsed_config,
    validationErrors: row.validation_errors,
    warnings: row.warnings,
    status: row.status,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ReleaseContractService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repositoryReader: RepositoryFileReader
  ) {}

  validateContent(content: string): ContractValidationResult {
    return validateReleaseContractContent(content);
  }

  async syncProjectContract(
    projectId: string,
    options: { ref?: string; path?: string } = {}
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        repoFullName: true,
        defaultBranch: true,
      },
    });
    if (!project) throw new Error("项目不存在");

    const [owner, repo] = project.repoFullName.split("/");
    if (!owner || !repo) throw new Error("项目仓库格式无效");

    const sourcePath = options.path ?? DEFAULT_RELEASE_CONTRACT_PATH;
    const sourceRef = options.ref ?? project.defaultBranch;
    const file = await this.repositoryReader.getFile({
      owner,
      repo,
      path: sourcePath,
      ref: sourceRef,
    });
    const validation = this.validateContent(file.content);

    await this.prisma.$transaction(async (transaction) => {
      await this.saveCache(transaction, projectId, file, validation);

      if (!validation.valid || !validation.contract) return;
      await this.syncChannels(transaction, projectId, validation.contract);
    });

    return {
      ...validation,
      source: {
        path: file.path,
        ref: file.ref,
        commitSha: file.commitSha,
        blobSha: file.blobSha,
      },
      drift: false,
    };
  }

  async getCachedContract(projectId: string): Promise<ContractCache | null> {
    const rows = await this.prisma.$queryRaw<ContractCacheRow[]>`
      SELECT
        project_id,
        schema_version,
        source_path,
        source_ref,
        source_commit_sha,
        source_blob_sha,
        content_hash,
        raw_content,
        parsed_config,
        validation_errors,
        warnings,
        status,
        synced_at,
        created_at,
        updated_at
      FROM release_contract_caches
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    return rows[0] ? mapCacheRow(rows[0]) : null;
  }

  async getContractStatus(projectId: string, checkRemote = false) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        repoFullName: true,
        defaultBranch: true,
      },
    });
    if (!project) throw new Error("项目不存在");

    const cache = await this.getCachedContract(projectId);
    if (!checkRemote || !cache) {
      return {
        cache,
        remote: null,
        drift: cache ? null : true,
      };
    }

    const [owner, repo] = project.repoFullName.split("/");
    const remote = await this.repositoryReader.getFile({
      owner,
      repo,
      path: cache.sourcePath,
      ref: cache.sourceRef || project.defaultBranch,
    });
    const remoteHash = hashReleaseContract(remote.content);

    return {
      cache,
      remote: {
        path: remote.path,
        ref: remote.ref,
        commitSha: remote.commitSha,
        blobSha: remote.blobSha,
        contentHash: remoteHash,
      },
      drift: remoteHash !== cache.contentHash,
    };
  }

  async getInputForm(projectId: string, channelKey: string) {
    const cache = await this.getCachedContract(projectId);
    if (!cache || cache.status !== "valid") {
      throw new Error("项目尚无有效的发布契约缓存");
    }

    const validation = this.validateContent(cache.rawContent);
    const channel = validation.contract?.channels[channelKey];
    if (!channel) throw new Error(`发布通道 ${channelKey} 不存在`);

    return {
      channelKey,
      name: channel.name ?? channelKey,
      triggerType: channel.trigger.type,
      fields: Object.entries(channel.inputs).map(([key, input]) => ({
        key,
        ...input,
      })),
    };
  }

  private async saveCache(
    transaction: Prisma.TransactionClient,
    projectId: string,
    file: RepositoryFileResult,
    validation: ContractValidationResult
  ): Promise<void> {
    const parsedConfig = validation.contract
      ? JSON.stringify(validation.contract)
      : null;
    const validationErrors = validation.errors.length
      ? JSON.stringify(validation.errors)
      : null;
    const warnings = validation.warnings.length
      ? JSON.stringify(validation.warnings)
      : null;
    const schemaVersion = validation.contract?.schemaVersion ?? 1;
    const status = validation.valid ? "valid" : "invalid";

    await transaction.$executeRaw`
      INSERT INTO release_contract_caches (
        project_id,
        schema_version,
        source_path,
        source_ref,
        source_commit_sha,
        source_blob_sha,
        content_hash,
        raw_content,
        parsed_config,
        validation_errors,
        warnings,
        status,
        synced_at,
        created_at,
        updated_at
      ) VALUES (
        ${projectId},
        ${schemaVersion},
        ${file.path},
        ${file.ref},
        ${file.commitSha},
        ${file.blobSha},
        ${validation.contentHash},
        ${file.content},
        ${parsedConfig}::jsonb,
        ${validationErrors}::jsonb,
        ${warnings}::jsonb,
        ${status},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (project_id) DO UPDATE SET
        schema_version = EXCLUDED.schema_version,
        source_path = EXCLUDED.source_path,
        source_ref = EXCLUDED.source_ref,
        source_commit_sha = EXCLUDED.source_commit_sha,
        source_blob_sha = EXCLUDED.source_blob_sha,
        content_hash = EXCLUDED.content_hash,
        raw_content = EXCLUDED.raw_content,
        parsed_config = EXCLUDED.parsed_config,
        validation_errors = EXCLUDED.validation_errors,
        warnings = EXCLUDED.warnings,
        status = EXCLUDED.status,
        synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;
  }

  private async syncChannels(
    transaction: Prisma.TransactionClient,
    projectId: string,
    contract: ReleaseContract
  ): Promise<void> {
    const entries = Object.entries(contract.channels);
    const channelKeys = entries.map(([key]) => key);

    await transaction.releaseChannel.updateMany({
      where: {
        projectId,
        ...(channelKeys.length > 0 ? { key: { notIn: channelKeys } } : {}),
      },
      data: { isActive: false },
    });

    for (const [key, channel] of entries) {
      const data = {
        name: channel.name ?? key,
        kind: channelKindMap[channel.kind],
        triggerType: triggerTypeMap[channel.trigger.type],
        workflowFile: channel.trigger.workflow ?? null,
        tagTemplate: contract.version.tagTemplate,
        refStrategy: channel.trigger.ref ?? "default_branch",
        inputsSchema: channel.inputs as Prisma.InputJsonValue,
        artifactRules: channel.artifacts as Prisma.InputJsonValue,
        dependencies: channel.dependsOn as Prisma.InputJsonValue,
        publishPolicy: {
          ...channel.publish,
          optional: channel.optional,
          production: channel.production ?? null,
          scriptRunner:
            channel.trigger.type === "script_runner"
              ? {
                  runner: channel.trigger.runner,
                  entrypoint: channel.trigger.entrypoint,
                }
              : null,
        } as Prisma.InputJsonValue,
        requiresApproval:
          channel.publish.approval || channel.production?.requiresApproval === true,
        isActive: true,
        sortOrder: channel.order,
      };

      await transaction.releaseChannel.upsert({
        where: {
          projectId_key: {
            projectId,
            key,
          },
        },
        update: data,
        create: {
          projectId,
          key,
          ...data,
        },
      });
    }
  }
}
