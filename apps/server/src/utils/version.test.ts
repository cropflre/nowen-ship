import assert from "node:assert/strict";
import test from "node:test";
import {
  bumpVersion,
  formatVersion,
  isValidVersion,
  parseVersion,
  toTagName,
} from "./version.js";

test("parseVersion supports tags and prerelease versions", () => {
  assert.deepEqual(parseVersion("v1.2.3-beta.4"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: "beta.4",
  });
});

test("formatVersion formats stable and prerelease versions", () => {
  assert.equal(
    formatVersion({ major: 2, minor: 0, patch: 1, prerelease: "rc.1" }),
    "2.0.1-rc.1"
  );
  assert.equal(formatVersion({ major: 2, minor: 0, patch: 1 }), "2.0.1");
});

test("bumpVersion handles stable release increments", () => {
  assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
});

test("bumpVersion creates and increments prerelease versions", () => {
  assert.equal(bumpVersion("1.2.3", "prerelease", "rc"), "1.2.4-rc.1");
  assert.equal(bumpVersion("1.2.4-rc.1", "prerelease", "rc"), "1.2.4-rc.2");
});

test("version validation and tag normalization are deterministic", () => {
  assert.equal(isValidVersion("v1.2.3-beta.1"), true);
  assert.equal(isValidVersion("1.2"), false);
  assert.equal(toTagName("1.2.3"), "v1.2.3");
  assert.equal(toTagName("v1.2.3"), "v1.2.3");
});
