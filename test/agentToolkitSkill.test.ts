import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GrowSurf Agent Toolkit skill", () => {
  const skill = readFileSync(join(process.cwd(), "skills/growsurf-agent-toolkit/SKILL.md"), "utf8");

  it("steers program creation around starter content and the GrowSurf Window", () => {
    expect(skill).toContain("starter content");
    expect(skill).toContain("GrowSurf Window");
    expect(skill).toMatch(/preserve/i);
    expect(skill).toContain("default source for Window copy");
  });

  it("routes embeddable frontend work through a design-focused workflow when available", () => {
    expect(skill).toContain("frontend-design");
    expect(skill).toContain("embeddable");
  });

  it("requires configuration review and exposes one-shot eval prompts", () => {
    expect(skill).toContain("Fetch the campaign, Design, Emails, Options, Installation, and Rewards again");
    expect(skill).toContain("sticky banner and inline heading");
    expect(skill).toContain("browser tab title motivator");
    expect(skill).toContain("growsurf_agent_program_creation_eval");
    expect(skill).toContain("One-Shot Eval Examples");
    expect(skill).toContain("browser-visible GrowSurf flow");
    expect(skill).toContain("growsurf_capture_referral_flow_screenshots");
    expect(skill).toContain("GrowSurf preview screenshots");
    expect(skill).toContain("own installed site");
    expect(skill).toContain("host agent's browser automation tool");
    expect(skill).toContain("read-only lookups");
  });
});
