import { Octokit } from "octokit";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface WorkflowDispatchInput {
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputs?: Record<string, string>;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  head_sha: string;
  created_at: string;
  updated_at: string;
}

export class GitHubService {
  private octokit: InstanceType<typeof Octokit>;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN,
      userAgent: "nowen-release-hub/0.1.0",
    });
  }

  /**
   * 触发 workflow_dispatch
   * GitHub 不支持直接返回 run_id，需要轮询获取
   */
  async triggerWorkflow(input: WorkflowDispatchInput): Promise<{ runId: number }> {
    const { owner, repo, workflowId, ref, inputs } = input;

    try {
      // 获取触发前的最后一个 run id
      const { data: beforeRuns } = await this.octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        branch: ref,
        per_page: 1,
      });
      const beforeRunId = beforeRuns.workflow_runs[0]?.id ?? -1;

      // 触发 workflow
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs,
      });

      // 轮询等待新 run 出现（最多 15 秒）
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1000));

        const { data: runs } = await this.octokit.rest.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id: workflowId,
          branch: ref,
          per_page: 1,
        });

        if (runs.total_count > 0 && runs.workflow_runs[0].id !== beforeRunId) {
          const runId = runs.workflow_runs[0].id;
          logger.info({ runId, owner, repo, workflowId }, "Workflow triggered");
          return { runId };
        }
      }

      throw new Error("Workflow 已触发，但无法获取 run ID，请稍后手动同步");
    } catch (error) {
      logger.error({ error, input }, "Failed to trigger workflow");
      throw new Error(
        `触发 Workflow 失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取单个 workflow run 详情
   */
  async getWorkflowRun(owner: string, repo: string, runId: number) {
    const { data } = await this.octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    return data;
  }

  /**
   * 列出项目的 workflow runs
   */
  async listWorkflowRuns(owner: string, repo: string, workflowId: string, perPage = 20) {
    const { data } = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      per_page: perPage,
    });
    return data.workflow_runs;
  }

  /**
   * 获取 workflow run 的 artifacts
   */
  async listRunArtifacts(owner: string, repo: string, runId: number) {
    const { data } = await this.octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId,
    });
    return data.artifacts;
  }

  /**
   * 获取仓库的 package.json 内容
   */
  async getPackageJson(owner: string, repo: string, ref = "main"): Promise<unknown> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: "package.json",
        ref,
      });

      if ("content" in data && data.content) {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      logger.warn({ error, owner, repo }, "Failed to fetch package.json");
      return null;
    }
  }

  /**
   * 创建 Git tag（通过创建 ref）
   * 注意：这里用简单方式，实际生产应该用 createTag (annotated tag)
   */
  async createTag(owner: string, repo: string, tagName: string, sha: string): Promise<void> {
    try {
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${tagName}`,
        sha,
      });
      logger.info({ owner, repo, tagName }, "Git tag created");
    } catch (error) {
      if (error instanceof Error && error.message.includes("already_exists")) {
        throw new Error(`Tag ${tagName} 已存在`);
      }
      throw error;
    }
  }

  /**
   * 获取最新的 Release
   */
  async getLatestRelease(owner: string, repo: string): Promise<{ tag_name: string } | null> {
    try {
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner,
        repo,
      });
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Not Found")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 创建 GitHub Release（draft）
   */
  async createRelease(params: {
    owner: string;
    repo: string;
    tagName: string;
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
    targetCommitish?: string;
  }) {
    const { data } = await this.octokit.rest.repos.createRelease({
      owner: params.owner,
      repo: params.repo,
      tag_name: params.tagName,
      name: params.name,
      body: params.body,
      draft: params.draft ?? true,
      prerelease: params.prerelease ?? false,
      target_commitish: params.targetCommitish,
    });
    logger.info({ releaseId: data.id, tagName: params.tagName }, "GitHub Release created");
    return { id: data.id, html_url: data.html_url };
  }

  /**
   * 发布 draft release
   */
  async publishRelease(owner: string, repo: string, releaseId: number): Promise<void> {
    await this.octokit.rest.repos.updateRelease({
      owner,
      repo,
      release_id: releaseId,
      draft: false,
    });
    logger.info({ releaseId }, "GitHub Release published");
  }
}
