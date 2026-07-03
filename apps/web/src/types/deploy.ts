export type DeployEnvironment = "dev" | "staging" | "prod";

export type DeployTargetType =
  | "server"
  | "static"
  | "docker"
  | "k8s"
  | "mobile"
  | "desktop";

export interface DeployTarget {
  id: string;
  projectId: string;
  name: string;
  environment: DeployEnvironment;
  type: DeployTargetType;
  config: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    repoFullName: string;
  };
  deployments?: Deployment[];
}

export type DeploymentStatus =
  | "queued"
  | "in_progress"
  | "success"
  | "failed"
  | "cancelled";

export interface Deployment {
  id: string;
  projectId: string;
  releasePlanId: string | null;
  deployTargetId: string;
  version: string;
  commitSha: string | null;
  status: DeploymentStatus;
  githubRunId: string | null;
  githubRunUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string;
  logs: string | null;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    repoFullName: string;
  };
  deployTarget?: {
    id: string;
    name: string;
    environment: DeployEnvironment;
  };
  releasePlan?: {
    id: string;
    version: string;
    tagName: string;
  } | null;
}

export interface CreateDeployTargetInput {
  projectId: string;
  name: string;
  environment: DeployEnvironment;
  type: DeployTargetType;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdateDeployTargetInput = Partial<CreateDeployTargetInput>;

export interface TriggerDeploymentInput {
  projectId: string;
  deployTargetId: string;
  releasePlanId?: string;
  version: string;
  commitSha?: string;
  triggeredBy?: string;
  inputs?: Record<string, string>;
}
