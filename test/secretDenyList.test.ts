import { describe, expect, it } from "vitest";
import { SECRET_DENY_LIST, isSecretPath } from "../src/growsurf/secretDenyList.js";

describe("SECRET_DENY_LIST", () => {
  it("is a non-empty, deduped list of patterns", () => {
    expect(Array.isArray(SECRET_DENY_LIST)).toBe(true);
    expect(SECRET_DENY_LIST.length).toBeGreaterThan(0);
    expect(new Set(SECRET_DENY_LIST).size).toBe(SECRET_DENY_LIST.length);
  });
});

describe("isSecretPath", () => {
  it.each([
    ".env",
    ".env.production",
    "config/secrets.json",
    "deploy/id_rsa",
    "certs/server.pem",
    ".aws/credentials",
    "terraform.tfstate",
  ])("flags %s as a secret", (path) => {
    expect(isSecretPath(path)).toBe(true);
  });

  it.each(["README.md", "src/index.ts", "package.json", "environment.md"])(
    "does not flag %s",
    (path) => {
      expect(isSecretPath(path)).toBe(false);
    },
  );

  it("normalizes a leading ./ and is case-insensitive", () => {
    expect(isSecretPath("./.env")).toBe(true);
    expect(isSecretPath("CERTS/SERVER.PEM")).toBe(true);
  });

  it("matches nested files under a dir/* pattern", () => {
    expect(isSecretPath("home/user/.aws/credentials")).toBe(true);
    expect(isSecretPath(".aws/sso/cache/token.json")).toBe(true);
  });

  it("returns false for empty input", () => {
    expect(isSecretPath("")).toBe(false);
  });
});
