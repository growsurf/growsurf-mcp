import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGrowSurfMcpServer } from "../src/index.js";
import { describe, expect, it } from "vitest";
import { computeParticipantAuthHash } from "../src/growsurf/participantAuth.js";

describe("computeParticipantAuthHash", () => {
  it("computes a stable SHA-256 HMAC hex", () => {
    const hash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
    });
    expect(hash).toBe("1d9ecfbe1b6ab47494cff73bd689c8289ecb9977c4d7e89f633c06a5bba3fafa");
  });

  it("signs affiliate Join as a separate scope", () => {
    const identityHash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
    });
    const joinHash = computeParticipantAuthHash({
      email: "Participant@Email.com",
      participantAuthSecret: "secret",
      affiliateJoin: true,
    });

    expect(joinHash).toBe("3fc5ffc499752aca6b2f2e128f298c73191aac88d55ca0d5fa6be2f784c12d26");
    expect(joinHash).not.toBe(identityHash);
  });
});

// The protocol boundary must never sign with a secret owned by the server.
describe("participant-auth MCP boundary", () => {
  it("requires a caller-owned secret for identity and affiliate-join hashes", async () => {
    const server = createGrowSurfMcpServer({ env: { GROWSURF_PARTICIPANT_AUTH_SECRET: "server-secret" } });
    const client = new Client({ name: "signing-boundary-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      for (const affiliateJoin of [false, true]) {
        const rejected = await client.callTool({ name: "growsurf_participant_auth_hash", arguments: { email: "Participant@Email.com", affiliateJoin } });
        expect(rejected.isError).toBe(true);
        expect(rejected.structuredContent).toBeUndefined();
        const accepted = await client.callTool({ name: "growsurf_participant_auth_hash", arguments: { email: "Participant@Email.com", participantAuthSecret: "secret", affiliateJoin } });
        expect(accepted.isError).not.toBe(true);
        expect(accepted.structuredContent).toEqual({ hash: affiliateJoin
          ? "3fc5ffc499752aca6b2f2e128f298c73191aac88d55ca0d5fa6be2f784c12d26"
          : "1d9ecfbe1b6ab47494cff73bd689c8289ecb9977c4d7e89f633c06a5bba3fafa" });
      }
      const { tools } = await client.listTools();
      expect(tools.find(tool => tool.name === "growsurf_participant_auth_hash")?.inputSchema.required).toContain("participantAuthSecret");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
