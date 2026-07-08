import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GrowSurf Agent Toolkit skill", () => {
  const skill = readFileSync(join(process.cwd(), "skills/growsurf-agent-toolkit/SKILL.md"), "utf8");

  it("steers program creation around starter content and the GrowSurf Window", () => {
    expect(skill).toContain("starter content");
    expect(skill).toContain("GrowSurf Window");
    expect(skill).toMatch(/preserve/i);
  });

  it("routes embeddable frontend work through a design-focused workflow when available", () => {
    expect(skill).toContain("frontend-design");
    expect(skill).toContain("embeddable");
  });
});
