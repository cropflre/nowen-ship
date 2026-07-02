export interface ReleasePlan {
  id: string;
  projectId: string;
  version: string;
  tagName: string;
  sourceBranch: string;
  sourceCommitSha: string | null;
  changelog: string;
  releaseType: "patch" | "minor" | "major" | "prerelease";
  status: "draft" | "pending" | "building" | "success" | "failed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    repoFullName: string;
  };
  releaseJobs?: ReleaseJob[];
  githubRelease?: GithubRelease | null;
}

export interface ReleaseJob {
  id: string;
  releasePlanId: string | null;
  projectId: string;
  githubRunId: number;
  githubRunUrl: string;
  workflowFile: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface GithubRelease {
  id: string;
  releasePlanId: string | null;
  projectId: string;
  githubReleaseId: number;
  tagName: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  htmlUrl: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface CreateReleasePlanInput {
  projectId: string;
  releaseType: "patch" | "minor" | "major" | "prerelease";
  sourceBranch: string;
  changelog: string;
  prereleaseTag?: string;
}
