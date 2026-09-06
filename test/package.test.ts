import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { GROWSURF_MCP_VERSION } from "../src/index.js";

const execFileAsync = promisify(execFile);

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
    expect(packageJson.version).toBe("0.14.0");
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

  it(
    "provides finite help and version commands without starting the stdio server",
    async () => {
      const sourceEntrypoint = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
      const commandPrefix = ["--import", "tsx", sourceEntrypoint];
      // Every invocation pays its own `tsx` cold start. Run the five concurrently rather than in
      // series: serially they add up to more than this test's budget whenever the suite is under
      // parallel load, which made a passing CLI look like a failing one.
      const run = (flag: string) =>
        execFileAsync(process.execPath, [...commandPrefix, flag], { timeout: 30_000 });

      const [help, shortHelp, version, shortVersion, unknown] = await Promise.all([
        run("--help"),
        run("-h"),
        run("--version"),
        run("-v"),
        run("--unknown").then(
          () => null,
          (error: unknown) => error,
        ),
      ]);

      expect(help.stderr).toBe("");
      expect(help.stdout).toContain("GrowSurf CLI and MCP server");
      expect(help.stdout).toContain("growsurf-mcp --version");
      expect(help.stdout).toContain("https://docs.growsurf.com/build-with-ai");
      expect(shortHelp.stdout).toBe(help.stdout);

      expect(version.stderr).toBe("");
      expect(version.stdout.trim()).toBe(packageJson.version);
      expect(shortVersion.stdout).toBe(version.stdout);

      expect(unknown, "Expected an unsupported CLI argument to fail").not.toBeNull();
      expect(unknown).toMatchObject({
        code: 1,
        stderr: expect.stringContaining("Run growsurf-mcp --help"),
      });
    },
    60_000,
  );

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
