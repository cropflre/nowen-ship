import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTransition,
  canTransition,
  deploymentTransitions,
  executionTransitions,
  releaseTransitions,
} from "./state-machine.js";

test("release state machine allows the publish path", () => {
  assert.equal(canTransition(releaseTransitions, "DRAFT", "PREFLIGHT_CHECKING"), true);
  assert.equal(canTransition(releaseTransitions, "PREFLIGHT_CHECKING", "READY"), true);
  assert.equal(canTransition(releaseTransitions, "READY", "RUNNING"), true);
  assert.equal(canTransition(releaseTransitions, "RUNNING", "VERIFYING"), true);
  assert.equal(canTransition(releaseTransitions, "VERIFYING", "PUBLISHABLE"), true);
  assert.equal(canTransition(releaseTransitions, "PUBLISHABLE", "PUBLISHED"), true);
});

test("execution state machine supports retries but protects terminal success", () => {
  assert.equal(canTransition(executionTransitions, "RUNNING", "FAILED"), true);
  assert.equal(canTransition(executionTransitions, "FAILED", "PENDING"), true);
  assert.equal(canTransition(executionTransitions, "SUCCEEDED", "PENDING"), false);
});

test("deployment state machine requires approval and health verification", () => {
  assert.equal(canTransition(deploymentTransitions, "PENDING_APPROVAL", "APPROVED"), true);
  assert.equal(canTransition(deploymentTransitions, "APPROVED", "DEPLOYING"), true);
  assert.equal(canTransition(deploymentTransitions, "DEPLOYING", "HEALTH_CHECKING"), true);
  assert.equal(canTransition(deploymentTransitions, "HEALTH_CHECKING", "SUCCEEDED"), true);
});

test("assertTransition rejects invalid state changes", () => {
  assert.throws(
    () => assertTransition(releaseTransitions, "DRAFT", "PUBLISHED", "Release"),
    /不能从 DRAFT 转换为 PUBLISHED/
  );
});
