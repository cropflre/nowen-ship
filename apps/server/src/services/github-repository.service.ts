import { Octokit } from "octokit";
import { env } from "../config/env.js";

export interface RepositoryFileInput {
  owner: string;
  repo: string;
  path: string;
  ref: string;
}

export interface RepositoryFileResult {
  content: string;
  path: string;
  ref: string;
  blobSha: string;
  commitSha: string;
}

export interface RepositoryFileReader {
  getFile(input: RepositoryFileInput): Promise<RepositoryFileResult>;
}

export class GitHubRepositoryService implements RepositoryFileReader {
  private readonly octokit: InstanceType<typeof Octokit>;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN,
      userAgent: "nowen-release-hub/0.1.0",
    });
  }

  async getFile(input: RepositoryFileInput): Promise<RepositoryFileResult> {
    const [{ data: contentData }, { data: commitData }] = await Promise.all([
      this.octokit.rest.repos.getContent({
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        ref: input.ref,
      }),
      this.octokit.rest.repos.getCommit({
        owner: input.owner,
        repo: input.repo,
        ref: input.ref,
      }),
    ]);

    if (Array.isArray(contentData) || contentData.type !== "file" || !("content" in contentData)) {
      throw new Error(`${input.path} 不是可读取的文件`);
    }

    if (!contentData.content) {
      throw new Error(`${input.path} 内容为空或无法通过 Contents API 读取`);
    }

    return {
      content: Buffer.from(contentData.content, "base64").toString("utf8"),
      path: contentData.path,
      ref: input.ref,
      blobSha: contentData.sha,
      commitSha: commitData.sha,
    };
  }
}
