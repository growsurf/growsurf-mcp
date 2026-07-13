import { describe, expect, it } from "vitest";
import {
  buildIntegrationConnectUrl,
  DASHBOARD_BASE_URL,
  getIntegration,
  INTEGRATION_KEYS,
  INTEGRATIONS,
} from "../src/growsurf/integrations.js";

describe("integrations registry", () => {
  it("includes Tango Card as a connectable gift-card integration", () => {
    const tango = getIntegration("tangocard");
    expect(tango).toBeDefined();
    expect(tango?.label).toBe("Tango Card");
    expect(tango?.category).toBe("Payouts & gift cards");
    expect(tango?.referralOnly).toBe(true);
  });

  it("includes the Resend and Loops dashboard integration keys verbatim", () => {
    expect(getIntegration("resenddotcom")).toEqual({
      key: "resenddotcom",
      label: "Resend",
      category: "Email & ESP",
    });
    expect(getIntegration("loopsdotso")).toEqual({
      key: "loopsdotso",
      label: "Loops",
      category: "Email & ESP",
    });
  });

  it("excludes integrations whose dashboard cards are commented out", () => {
    // XTRM (internal payout rail), Chargify, and Pipedrive are not user-connectable.
    expect(getIntegration("xtrm")).toBeUndefined();
    expect(getIntegration("chargify")).toBeUndefined();
    expect(getIntegration("pipedrive")).toBeUndefined();
    expect(INTEGRATION_KEYS).not.toContain("xtrm");
  });

  it("keeps the camelCase deep-link keys verbatim (they must match the dashboard card id)", () => {
    for (const key of ["constantContact", "campaignMonitor", "helpScout", "pabblyConnect", "baskHealth"]) {
      expect(INTEGRATION_KEYS).toContain(key);
    }
    // Tango Card's deep-link key is lowercase, not the camelCase storage key.
    expect(INTEGRATION_KEYS).toContain("tangocard");
    expect(INTEGRATION_KEYS).not.toContain("tangoCard");
  });

  it("has unique keys and a non-empty label + category on every entry", () => {
    const keys = INTEGRATIONS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const integration of INTEGRATIONS) {
      expect(integration.key.length).toBeGreaterThan(0);
      expect(integration.label.length).toBeGreaterThan(0);
      expect(integration.category.length).toBeGreaterThan(0);
    }
  });
});

describe("buildIntegrationConnectUrl", () => {
  it("builds the editor integrations deep link for the given program", () => {
    expect(buildIntegrationConnectUrl("abc123", "stripe")).toBe(
      "https://app.growsurf.com/editor/abc123/options/integrations?integration=stripe",
    );
  });

  it("preserves a camelCase integration key in the query param", () => {
    expect(buildIntegrationConnectUrl("abc123", "constantContact")).toBe(
      "https://app.growsurf.com/editor/abc123/options/integrations?integration=constantContact",
    );
  });

  it("uses the public dashboard base url", () => {
    expect(buildIntegrationConnectUrl("abc123", "paypal").startsWith(DASHBOARD_BASE_URL)).toBe(true);
  });
});
