import { describe, expect, it } from "vitest";
import { PAYOUT_DESTINATION_PROVIDER_INPUTS } from "../src/growsurf/payoutProviders.js";
import { TOOL_OUTPUT_SCHEMAS } from "../src/growsurf/outputSchemas.js";

describe("payout provider contracts", () => {
  it("keeps provider writes closed while status outputs remain forward-compatible", () => {
    expect(PAYOUT_DESTINATION_PROVIDER_INPUTS).toEqual(["PAYPAL", "WISECOM"]);
    const status = TOOL_OUTPUT_SCHEMAS.growsurf_get_participant_payout_destination as any;
    expect(status.properties.activeProvider.enum).toBeUndefined();
    expect(status.properties.enabledProviders.items.enum).toBeUndefined();
    expect(status.properties.destinations.items.properties.provider.enum).toBeUndefined();
  });
});
