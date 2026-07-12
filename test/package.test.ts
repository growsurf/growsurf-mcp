import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROWSURF_MCP_VERSION } from "../src/index.js";

describe("package distribution", () => {
  it("ships the hosted-server exports and advertised Agent Skill bundle", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as {
      exports?: Record<string, string | { types?: string; default?: string }>;
      files?: string[];
      types?: string;
      version?: string;
    };

    expect(packageJson.version).toBe("0.8.0");
    expect(GROWSURF_MCP_VERSION).toBe(packageJson.version);
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports).toMatchObject({
      "./server": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
      "./prompts": {
        types: "./dist/prompts.d.ts",
        default: "./dist/prompts.js",
      },
    });
    expect(packageJson.files).toContain("skills");
  });
});
