import { describe, expect, it } from "vitest";
import { renderApiLibrarySnippets } from "../src/growsurf/apiLibrarySnippets.js";

describe("renderApiLibrarySnippets", () => {
  it("renders official mobile-token methods for every REST API library", () => {
    const text = renderApiLibrarySnippets(
      {
        language: "all",
        workflow: "mobile_participant_token",
        participantIdOrEmail: "person@example.com",
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("Create Mobile Participant Token");
    expect(text).toContain("createMobileToken");
    expect(text).toContain("create_mobile_token");
    expect(text).toContain("participantToken");
    expect(text).toContain("participant_token");
    expect(text).toContain("ParticipantCreateMobileTokenParams");
    expect(text).toContain("person@example.com");
    expect(text).toContain("abc123");
  });

  it("uses the PHP invoiceID named argument for recordTransaction", () => {
    const text = renderApiLibrarySnippets(
      {
        language: "php",
        workflow: "record_transaction",
        participantIdOrEmail: "participant_123",
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("invoiceID: 'invoice_123'");
    expect(text).not.toContain("invoiceId: 'invoice_123'");
  });
});
