/**
 * 语义化版本工具函数
 */

export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
} {
  // 支持 v1.2.3 和 1.2.3 和 1.2.3-beta.1
  const cleaned = version.replace(/^v/, "");
  const [base, pre] = cleaned.split("-");
  const parts = base.split(".").map(Number);

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease: pre ?? null,
  };
}

export function formatVersion(v: {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string | null;
}): string {
  let str = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) str += `-${v.prerelease}`;
  return str;
}

export function bumpVersion(
  current: string,
  type: "patch" | "minor" | "major" | "prerelease",
  prereleaseTag?: string
): string {
  const v = parseVersion(current);

  switch (type) {
    case "patch":
      v.patch += 1;
      v.prerelease = null;
      break;
    case "minor":
      v.minor += 1;
      v.patch = 0;
      v.prerelease = null;
      break;
    case "major":
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      v.prerelease = null;
      break;
    case "prerelease":
      if (v.prerelease) {
        // 已有 prerelease，递增编号
        const match = v.prerelease.match(/^(.+?)\.(\d+)$/);
        if (match) {
          v.prerelease = `${match[1]}.${Number(match[2]) + 1}`;
        } else {
          v.prerelease = `${prereleaseTag ?? "beta"}.1`;
        }
      } else {
        v.patch += 1;
        v.prerelease = `${prereleaseTag ?? "beta"}.1`;
      }
      break;
  }

  return formatVersion(v);
}

export function isValidVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+(-[\w.]+)?$/.test(version);
}

export function toTagName(version: string): string {
  return `v${version.replace(/^v/, "")}`;
}
