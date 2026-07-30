import { describe, expect, it } from "vitest";
import { renderApiLibrarySnippets } from "../src/growsurf/apiLibrarySnippets.js";

describe("renderApiLibrarySnippets", () => {
  it("renders official mobile participant token methods for every REST API library", () => {
    const text = renderApiLibrarySnippets(
      {
        language: "all",
        workflow: "mobile_participant_token",
        email: "person@example.com",
        referredBy: "referrer_id",
      },
      { campaignId: "abc123" },
    );

    expect(text).toContain("Create Mobile Participant Token");
    expect(text).toContain("client.campaign.createMobileParticipantToken");
    expect(text).toContain("client.campaign.create_mobile_participant_token");
    expect(text).toContain("$client->campaign->createMobileParticipantToken");
    expect(text).toContain("growsurf.campaign.create_mobile_participant_token");
    expect(text).toContain("client.campaign().createMobileParticipantToken");
    expect(text).not.toContain("/mobile-participant-token");
    expect(text).not.toContain("requests.post");
    expect(text).not.toContain("file_get_contents");
    expect(text).not.toContain("Net::HTTP::Post");
    expect(text).not.toContain("HttpRequest.newBuilder");
    expect(text).toContain("participantToken");
    expect(text).toContain("person@example.com");
    expect(text).toContain("referredBy");
    expect(text).toContain("referrer_id");
    expect(text).toContain("mobileInstanceId");
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
