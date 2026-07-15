import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  hashReleaseContract,
  validateReleaseContractContent,
} from "./release-contract.parser.js";

const exampleFiles = [
  "nowen-note.release.yml",
  "nowen-reader.release.yml",
  "nowen-video.release.yml",
];

for (const fileName of exampleFiles) {
  test(`${fileName} passes schema v1 validation`, async () => {
    const content = await readFile(
      new URL(`../../../../examples/contracts/${fileName}`, import.meta.url),
      "utf8"
    );
    const result = validateReleaseContractContent(content);

    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
    assert.equal(result.contract?.schemaVersion, 1);
    assert.ok(result.contract && Object.keys(result.contract.channels).length > 0);
  });
}

test("invalid workflow path and tag template are rejected", () => {
  const result = validateReleaseContractContent(`
schemaVersion: 1
project:
  key: invalid-project
version:
  source:
    type: json
    file: package.json
    path: version
  tagTemplate: fixed-tag
channels:
  desktop:
    kind: desktop
    trigger:
      type: workflow_dispatch
      workflow: release.yml
`);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path.includes("workflow")));
  assert.ok(result.errors.some((error) => error.path.includes("tagTemplate")));
});

test("choice input default must exist in options", () => {
  const result = validateReleaseContractContent(`
schemaVersion: 1
project:
  key: invalid-input
version:
  source:
    type: github_release
  tagTemplate: "v{{version}}"
channels:
  docker:
    kind: docker
    trigger:
      type: workflow_dispatch
      workflow: .github/workflows/docker.yml
    inputs:
      environment:
        type: choice
        options: [staging, production]
        default: preview
`);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.message.includes("options")));
});

test("channel dependency cycles are rejected", () => {
  const result = validateReleaseContractContent(`
schemaVersion: 1
project:
  key: cyclic-project
version:
  source:
    type: github_release
  tagTemplate: "v{{version}}"
channels:
  build:
    kind: server
    trigger:
      type: tag_push
      workflow: .github/workflows/build.yml
    dependsOn: [deploy]
  deploy:
    kind: server
    trigger:
      type: workflow_dispatch
      workflow: .github/workflows/deploy.yml
    dependsOn: [build]
`);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.message.includes("循环")));
});

test("missing schemaVersion is accepted with an upgrade warning", () => {
  const result = validateReleaseContractContent(`
project:
  key: legacy-compatible
version:
  source:
    type: github_release
  tagTemplate: "v{{version}}"
channels:
  release:
    kind: server
    trigger:
      type: tag_push
      workflow: .github/workflows/release.yml
`);

  assert.equal(result.valid, true);
  assert.equal(result.contract?.schemaVersion, 1);
  assert.equal(result.warnings.length, 1);
});

test("future schema versions are rejected explicitly", () => {
  const result = validateReleaseContractContent(`schemaVersion: 2`);

  assert.equal(result.valid, false);
  assert.equal(result.errors[0]?.code, "unsupported_future_schema");
});

test("content hashing is deterministic and detects changes", () => {
  assert.equal(hashReleaseContract("a"), hashReleaseContract("a"));
  assert.notEqual(hashReleaseContract("a"), hashReleaseContract("a\n"));
});
