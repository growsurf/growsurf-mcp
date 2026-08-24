import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { GROWSURF_MCP_VERSION } from "../src/index.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  exports?: Record<string, string | { types?: string; default?: string }>;
  bin?: Record<string, string>;
  description?: string;
  files?: string[];
  mcpName?: string;
  types?: string;
  version?: string;
};
const serverJson = JSON.parse(
  readFileSync(new URL("../server.json", import.meta.url), "utf8"),
) as {
  packages?: Array<{ version?: string }>;
  version?: string;
};

describe("package distribution", () => {
  it("ships the hosted-server exports and advertised Agent Skill bundle", () => {
    expect(packageJson.version).toBe("0.12.1");
    expect(packageJson.mcpName).toBe("com.growsurf/growsurf");
    expect(packageJson.description).toMatch(/^Official GrowSurf CLI/);
    expect(packageJson.bin).toEqual({ "growsurf-mcp": "./dist/cli.js" });
    expect(GROWSURF_MCP_VERSION).toBe(packageJson.version);
    expect(serverJson.version).toBe(packageJson.version);
    expect(serverJson.packages?.[0]?.version).toBe(packageJson.version);
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

  it.skipIf(process.platform === "win32")(
    "starts the stdio server when npm invokes the bin through a Unix symlink",
    async () => {
      const binPath = packageJson.bin?.["growsurf-mcp"];
      expect(binPath).toBeDefined();

      const packageRoot = fileURLToPath(new URL("../", import.meta.url));
      const sourceEntrypoint = resolve(
        packageRoot,
        binPath!.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ".ts"),
      );
      const linkDirectory = join(
        tmpdir(),
        `growsurf-mcp-bin-${createHash("sha256").update(sourceEntrypoint).digest("hex").slice(0, 12)}`,
      );
      const linkedEntrypoint = join(linkDirectory, "growsurf-mcp.ts");

      await mkdir(linkDirectory, { recursive: true });
      try {
        await symlink(sourceEntrypoint, linkedEntrypoint);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }

      const transport = new StdioClientTransport({
        command: process.execPath,
        args: ["--import", "tsx", linkedEntrypoint],
        stderr: "pipe",
      });
      const client = new Client({ name: "package-bin-test", version: "1.0.0" });

      try {
        await client.connect(transport);
        const listed = await client.listResources();
        expect(listed.resources).toEqual(expect.arrayContaining([
          expect.objectContaining({ uri: "growsurf://agent-index" }),
        ]));
      } finally {
        await client.close();
      }
    },
    10_000,
  );
});
