import { describe, expect, it } from "vitest";
import { PAYOUT_DESTINATION_PROVIDER_INPUTS } from "../src/growsurf/payoutProviders.js";
import { TOOL_OUTPUT_SCHEMAS } from "../src/growsurf/outputSchemas.js";

describe("payout provider contracts", () => {
  it("keeps provider writes closed while status outputs remain forward-compatible", () => {
    expect(PAYOUT_DESTINATION_PROVIDER_INPUTS).toEqual(["PAYPAL", "WISECOM"]);
    const status = TOOL_OUTPUT_SCHEMAS.growsurf_get_participant_payout_destination as any;
    expect(status.properties.participantId).toBeUndefined();
    expect(status.properties.activeProvider.enum).toBeUndefined();
    expect(status.properties.enabledProviders.items.enum).toBeUndefined();
    expect(status.properties.destinations.items.properties.provider.enum).toBeUndefined();
    expect(status.properties.activeProvider.description).toMatch(/open-ended/i);
    expect(status.properties.enabledProviders.description).toMatch(/open-ended/i);
    expect(status.properties.destinations.items.properties.provider.description).toMatch(/open-ended/i);

    const confirmation =
      TOOL_OUTPUT_SCHEMAS.growsurf_request_participant_payout_destination_confirmation as any;
    expect(confirmation.properties.provider.enum).toBeUndefined();
    expect(confirmation.properties.provider.description).toMatch(/open-ended/i);
  });

  it("documents only payout-destination statuses the public status view can return", () => {
    const status = TOOL_OUTPUT_SCHEMAS.growsurf_get_participant_payout_destination as any;
    const statusDescription = status.properties.destinations.items.properties.status.description;
    for (const currentStatus of [
      "NONE",
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "ACTIVE",
      "NEEDS_REPAIR",
      "EXPIRED",
    ]) {
      expect(statusDescription).toContain(`\`${currentStatus}\``);
    }
    expect(statusDescription).not.toMatch(/`SUPERSEDED`|`REVOKED`/);
    expect(statusDescription).toMatch(/projected as `NONE`/i);
  });
});
