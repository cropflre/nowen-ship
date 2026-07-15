export const releaseStatuses = [
  "DRAFT",
  "PREFLIGHT_CHECKING",
  "READY",
  "RUNNING",
  "VERIFYING",
  "PUBLISHABLE",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
] as const;

export const executionStatuses = [
  "PENDING",
  "DISPATCHING",
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
  "SKIPPED",
] as const;

export const deploymentStatuses = [
  "PENDING_APPROVAL",
  "APPROVED",
  "DEPLOYING",
  "HEALTH_CHECKING",
  "SUCCEEDED",
  "FAILED",
  "ROLLING_BACK",
  "ROLLED_BACK",
  "CANCELLED",
] as const;

export type ReleaseState = (typeof releaseStatuses)[number];
export type ExecutionState = (typeof executionStatuses)[number];
export type DeploymentState = (typeof deploymentStatuses)[number];

type TransitionMap<State extends string> = Readonly<Record<State, readonly State[]>>;

export const releaseTransitions: TransitionMap<ReleaseState> = {
  DRAFT: ["PREFLIGHT_CHECKING", "CANCELLED"],
  PREFLIGHT_CHECKING: ["READY", "FAILED", "CANCELLED"],
  READY: ["RUNNING", "CANCELLED"],
  RUNNING: ["VERIFYING", "FAILED", "CANCELLED"],
  VERIFYING: ["PUBLISHABLE", "FAILED", "CANCELLED"],
  PUBLISHABLE: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: [],
  FAILED: ["PREFLIGHT_CHECKING", "RUNNING", "CANCELLED"],
  CANCELLED: [],
};

export const executionTransitions: TransitionMap<ExecutionState> = {
  PENDING: ["DISPATCHING", "CANCELLED", "SKIPPED"],
  DISPATCHING: ["QUEUED", "RUNNING", "FAILED", "CANCELLED"],
  QUEUED: ["RUNNING", "FAILED", "CANCELLED", "TIMED_OUT"],
  RUNNING: ["SUCCEEDED", "FAILED", "CANCELLED", "TIMED_OUT"],
  SUCCEEDED: [],
  FAILED: ["PENDING"],
  CANCELLED: ["PENDING"],
  TIMED_OUT: ["PENDING"],
  SKIPPED: ["PENDING"],
};

export const deploymentTransitions: TransitionMap<DeploymentState> = {
  PENDING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["DEPLOYING", "CANCELLED"],
  DEPLOYING: ["HEALTH_CHECKING", "FAILED", "CANCELLED"],
  HEALTH_CHECKING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["ROLLING_BACK"],
  FAILED: ["ROLLING_BACK", "DEPLOYING", "CANCELLED"],
  ROLLING_BACK: ["ROLLED_BACK", "FAILED"],
  ROLLED_BACK: [],
  CANCELLED: [],
};

export function canTransition<State extends string>(
  transitions: TransitionMap<State>,
  from: State,
  to: State
): boolean {
  return transitions[from].includes(to);
}

export function assertTransition<State extends string>(
  transitions: TransitionMap<State>,
  from: State,
  to: State,
  entityName: string
): void {
  if (!canTransition(transitions, from, to)) {
    throw new Error(`${entityName} 状态不能从 ${from} 转换为 ${to}`);
  }
}
