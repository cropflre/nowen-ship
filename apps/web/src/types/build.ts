export interface ReleaseJob {
  id: string;
  releasePlanId: string | null;
  projectId: string;
  githubRunId: number;
  githubRunUrl: string;
  workflowFile: string;
  status: "queued" | "in_progress" | "success" | "failed" | "cancelled";
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    repoFullName: string;
  };
  artifacts?: ReleaseArtifact[];
  releasePlan?: {
    id: string;
    version: string;
    tagName: string;
  } | null;
}

export interface ReleaseArtifact {
  id: string;
  releaseJobId: string;
  githubArtifactId: number;
  name: string;
  fileName: string | null;
  sizeBytes: number | null;
  platform: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  sha256: string | null;
  createdAt: string;
}

export interface TriggerBuildInput {
  projectId: string;
  releasePlanId?: string;
  ref?: string;
  inputs?: Record<string, string>;
}
