import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";
import { GrowSurfClient } from "../src/growsurf/client.js";
import { TOOL_OUTPUT_SCHEMAS } from "../src/growsurf/outputSchemas.js";
import { TOOL_AUTHORIZATION_MANIFEST } from "../src/toolAuthorization.js";

const originalFetch = globalThis.fetch;

describe("Program Resources", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses the public REST resource paths", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "resource-1", success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "program-1" });

    await client.listProgramResources();
    await client.createProgramResource({ type: "LINK", title: "Guide", url: "https://example.com" });
    await client.updateProgramResource("resource-1", { position: 0 });
    await client.deleteProgramResource("resource-1");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ["https://api.growsurf.com/v2/campaign/program-1/resources", "GET"],
      ["https://api.growsurf.com/v2/campaign/program-1/resources", "POST"],
      ["https://api.growsurf.com/v2/campaign/program-1/resources/resource-1", "PATCH"],
      ["https://api.growsurf.com/v2/campaign/program-1/resources/resource-1", "DELETE"],
    ]);
  });

  it("supports an explicit campaignId without sending the routing field to REST", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "resource-1", type: "LINK", title: "Guide" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "default-program" },
    });
    const client = new Client({ name: "program-resource-override-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const createResult = await client.callTool({
        name: "growsurf_create_program_resource",
        arguments: {
          campaignId: "override-program",
          type: "LINK",
          title: "Guide",
          url: "https://example.com/guide",
        },
      });
      const updateResult = await client.callTool({
        name: "growsurf_update_program_resource",
        arguments: {
          campaignId: "override-program",
          resourceId: "resource-1",
          position: 0,
        },
      });

      expect(createResult.isError).not.toBe(true);
      expect(updateResult.isError).not.toBe(true);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        "https://api.growsurf.com/v2/campaign/override-program/resources",
        "https://api.growsurf.com/v2/campaign/override-program/resources/resource-1",
      ]);
      for (const [, init] of fetchMock.mock.calls) {
        expect(JSON.parse(String((init as RequestInit).body))).not.toHaveProperty("campaignId");
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("accepts an exact configured HTTPS upload origin and returns only confirmation fields", async () => {
    const fileBytes = Buffer.from("%PDF-safe-test");
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response(JSON.stringify({
          ticket: "one-time-ticket-with-enough-entropy",
          expiresIn: 600,
          uploadUrl: "https://uploads.example.com/v1/upload",
          uploadParameters: {
            timestamp: 123,
            signature: "upload-signature",
            overwrite: false,
            api_key: "write-only-key",
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        asset_id: "asset-private",
        public_id: "program-resources/file",
        version: 123,
        signature: "result-signature",
        resource_type: "raw",
        type: "authenticated",
        bytes: fileBytes.byteLength,
        secure_url: "https://downloads.example.com/file.pdf",
        format: "pdf",
        extra_provider_field: "not-returned",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "program-1",
        GROWSURF_UPLOAD_ALLOWED_ORIGINS: "https://uploads.example.com",
      },
    });
    const client = new Client({ name: "program-resource-upload-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({
        name: "growsurf_prepare_program_resource_file",
        arguments: {
          fileName: "guide.pdf",
          mimeType: "application/pdf",
          fileBase64: fileBytes.toString("base64"),
        },
      });

      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual({
        uploadTicket: "one-time-ticket-with-enough-entropy",
        uploadResult: {
          public_id: "program-resources/file",
          version: 123,
          signature: "result-signature",
          resource_type: "raw",
          type: "authenticated",
          bytes: fileBytes.byteLength,
          secure_url: "https://downloads.example.com/file.pdf",
        },
      });
      expect(JSON.stringify(result)).not.toContain("write-only-key");
      expect(JSON.stringify(result)).not.toContain("uploads.example.com");
      expect(JSON.stringify(result)).not.toContain(fileBytes.toString("base64"));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://api.growsurf.com/v2/campaign/program-1/resource-upload-tickets",
      );
      const ticketBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
      expect(ticketBody).toEqual({
        fileName: "guide.pdf",
        mimeType: "application/pdf",
        bytes: fileBytes.byteLength,
      });
      expect(fetchMock.mock.calls[1]?.[0]).toEqual(new URL("https://uploads.example.com/v1/upload"));
      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
        method: "POST",
        redirect: "error",
      });
      expect((fetchMock.mock.calls[1]?.[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
      expect((fetchMock.mock.calls[1]?.[1] as RequestInit).body).toBeInstanceOf(FormData);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each([
    ["malformed base64", { fileName: "guide.pdf", mimeType: "application/pdf", fileBase64: "not base64" }, "fileBase64"],
    ["non-canonical base64", { fileName: "guide.pdf", mimeType: "application/pdf", fileBase64: "AB==" }, "fileBase64"],
    ["data URL", { fileName: "guide.pdf", mimeType: "application/pdf", fileBase64: "data:application/pdf;base64,AAAA" }, "fileBase64"],
    ["unsafe file name", { fileName: "../guide.pdf", mimeType: "application/pdf", fileBase64: "AAAA" }, "fileName"],
    ["overlong file name", { fileName: `${"a".repeat(117)}.pdf`, mimeType: "application/pdf", fileBase64: "AAAA" }, "fileName"],
    ["mismatched MIME", { fileName: "guide.pdf", mimeType: "image/png", fileBase64: "AAAA" }, "mimeType"],
    ["caller upload URL", {
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      fileBase64: "AAAA",
      uploadUrl: "https://attacker.example/upload",
    }, "uploadUrl"],
  ])("rejects %s before requesting a ticket", async (_label, arguments_, expectedField) => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "program-1",
        GROWSURF_UPLOAD_ALLOWED_ORIGINS: "https://uploads.example.com",
      },
    });
    const client = new Client({ name: "program-resource-invalid-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({
        name: "growsurf_prepare_program_resource_file",
        arguments: arguments_,
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      const error = JSON.parse(text) as {
        code?: string;
        status?: number;
        errors?: Array<{ field?: string }>;
      };
      expect(error.code).toBe("INVALID_TOOL_INPUT");
      expect(error.status).toBe(400);
      expect(error.errors?.some((detail) => detail.field === expectedField)).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("rejects encoded input above the 10 MB decoded ceiling before requesting a ticket", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "program-1",
        GROWSURF_UPLOAD_ALLOWED_ORIGINS: "https://uploads.example.com",
      },
    });
    const client = new Client({ name: "program-resource-oversize-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({
        name: "growsurf_prepare_program_resource_file",
        arguments: {
          fileName: "guide.pdf",
          mimeType: "application/pdf",
          fileBase64: "A".repeat(4 * Math.ceil((10 * 1024 * 1024) / 3) + 4),
        },
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      const error = JSON.parse(text) as {
        code?: string;
        status?: number;
        errors?: Array<{ field?: string }>;
      };
      expect(error.code).toBe("INVALID_TOOL_INPUT");
      expect(error.status).toBe(400);
      expect(error.errors?.some((detail) => detail.field === "fileBase64")).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("accepts exactly 10 MB and sends the decoded byte count to the ticket endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "stop before upload" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: {
        GROWSURF_API_KEY: "api_key",
        GROWSURF_CAMPAIGN_ID: "program-1",
        GROWSURF_UPLOAD_ALLOWED_ORIGINS: "https://uploads.example.com",
      },
    });
    const client = new Client({ name: "program-resource-max-size-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const fileBytes = Buffer.alloc(10 * 1024 * 1024);
      const result = await client.callTool({
        name: "growsurf_prepare_program_resource_file",
        arguments: {
          fileName: "maximum.pdf",
          mimeType: "application/pdf",
          fileBase64: fileBytes.toString("base64"),
        },
      });

      expect(result.isError).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toMatchObject({
        bytes: 10 * 1024 * 1024,
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("does not upload when the API ticket request fails", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "ticket rejected" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "program-1",
      uploadAllowedOrigins: "https://uploads.example.com",
    });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-safe-test"),
    })).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not upload when API ticket parameters reserve the file field", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ticket: "one-time-ticket-with-enough-entropy",
        uploadUrl: "https://uploads.example.com/v1/upload",
        uploadParameters: { timestamp: 123, signature: "upload-signature", file: "second-file" },
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "program-1",
      uploadAllowedOrigins: "https://uploads.example.com",
    });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-safe-test"),
    })).rejects.toMatchObject({ code: "PROGRAM_RESOURCE_UPLOAD_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["failed response", new Response(JSON.stringify({ message: "upload rejected" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })],
    ["ambiguous response", new Response("not-json", {
      status: 200,
      headers: { "content-type": "text/plain" },
    })],
  ])("never replays an upload after a %s", async (_label, uploadResponse) => {
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response(JSON.stringify({
          ticket: "one-time-ticket-with-enough-entropy",
          uploadUrl: "https://uploads.example.com/v1/upload",
          uploadParameters: { timestamp: 123, signature: "upload-signature" },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return uploadResponse;
    });
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "program-1",
      uploadAllowedOrigins: "https://uploads.example.com",
    });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-safe-test"),
    })).rejects.toMatchObject({ code: "PROGRAM_RESOURCE_UPLOAD_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps internal file coordinates out of the advertised output", () => {
    const advertised = JSON.stringify(TOOL_OUTPUT_SCHEMAS.growsurf_list_program_resources);

    expect(advertised).not.toContain("publicId");
    expect(advertised).not.toContain("mediaAssetId");
    expect(advertised).not.toContain("deliveryType");
    expect(advertised).toContain("moderationStatus");
  });

  it("fails closed when the upload origin allowlist is absent", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({ apiKey: "api_key", campaignId: "program-1" });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-safe-test"),
    })).rejects.toMatchObject({ code: "PROGRAM_RESOURCE_UPLOAD_ERROR" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an API-issued upload origin that is not an exact allowlist match", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ticket: "one-time-ticket-with-enough-entropy",
        uploadUrl: "https://uploads.example.com/v1/upload",
        uploadParameters: { signature: "upload-signature" },
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "program-1",
      uploadAllowedOrigins: "https://different.example.com",
    });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: Buffer.from("%PDF-safe-test"),
    })).rejects.toMatchObject({ code: "PROGRAM_RESOURCE_UPLOAD_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an upload confirmation larger than 256 KiB without replaying the upload", async () => {
    const fileBytes = Buffer.from("%PDF-safe-test");
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response(JSON.stringify({
          ticket: "one-time-ticket-with-enough-entropy",
          uploadUrl: "https://uploads.example.com/v1/upload",
          uploadParameters: { signature: "upload-signature" },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ padding: "x".repeat(256 * 1024) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new GrowSurfClient({
      apiKey: "api_key",
      campaignId: "program-1",
      uploadAllowedOrigins: "https://uploads.example.com",
    });

    await expect(client.prepareProgramResourceFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      bytes: fileBytes,
    })).rejects.toMatchObject({ code: "PROGRAM_RESOURCE_UPLOAD_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the public upload-ticket contract for FILE resource writes", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "resource-1", type: "FILE", title: "Media kit" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "program-1" },
    });
    const client = new Client({ name: "program-resource-test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const createTool = tools.tools.find((candidate) => candidate.name === "growsurf_create_program_resource");
      const prepareTool = tools.tools.find(
        (candidate) => candidate.name === "growsurf_prepare_program_resource_file",
      );

      expect(createTool?.inputSchema.properties).not.toHaveProperty("mediaAssetId");
      expect(createTool?.inputSchema.properties).toHaveProperty("uploadTicket");
      expect(createTool?.inputSchema.properties).toHaveProperty("uploadResult");
      expect(createTool?.inputSchema.properties.uploadResult.properties.bytes.maximum).toBe(10 * 1024 * 1024);
      expect(prepareTool?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });

      const result = await client.callTool({
        name: "growsurf_create_program_resource",
        arguments: {
          type: "FILE",
          title: "Media kit",
          uploadTicket: "ticket-token-with-enough-entropy",
          uploadResult: {
            public_id: "program-resources/media-kit.pdf",
            version: 123,
            signature: "provider-signature",
            resource_type: "raw",
            type: "authenticated",
            bytes: 12,
            secure_url: "https://uploads.example.com/media-kit.pdf",
          },
        },
      });

      expect(result.isError).not.toBe(true);
      expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toMatchObject({
        type: "FILE",
        uploadTicket: "ticket-token-with-enough-entropy",
        uploadResult: { version: 123, signature: "provider-signature" },
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each([
    ["create FILE with a LINK field", "growsurf_create_program_resource", {
      type: "FILE",
      title: "Media kit",
      url: "https://example.com/guide",
      uploadTicket: "ticket-token-with-enough-entropy",
      uploadResult: {
        public_id: "program-resources/media-kit.pdf",
        version: 123,
        signature: "provider-signature",
        resource_type: "raw",
        type: "authenticated",
        bytes: 12,
        secure_url: "https://downloads.example.com/media-kit.pdf",
      },
    }],
    ["update with two content types", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      url: "https://example.com/guide",
      text: "Guide",
    }],
    ["update with only one upload field", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      uploadTicket: "ticket-token-with-enough-entropy",
    }],
    ["update with no changed fields", "growsurf_update_program_resource", {
      resourceId: "resource-1",
    }],
    ["update with only a campaign override", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      campaignId: "override-program",
    }],
    ["update FILE without replacement content", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      type: "FILE",
    }],
    ["update LINK without replacement content", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      type: "LINK",
    }],
    ["update TEXT without replacement content", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      type: "TEXT",
    }],
    ["update LINK with FILE fields", "growsurf_update_program_resource", {
      resourceId: "resource-1",
      type: "LINK",
      uploadTicket: "ticket-token-with-enough-entropy",
      uploadResult: {
        public_id: "program-resources/media-kit.pdf",
        version: 123,
        signature: "provider-signature",
        resource_type: "raw",
        type: "authenticated",
        bytes: 12,
        secure_url: "https://downloads.example.com/media-kit.pdf",
      },
    }],
  ])("rejects %s before calling REST", async (_label, name, arguments_) => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "program-1" },
    });
    const client = new Client({ name: "program-resource-contract-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name, arguments: arguments_ });
      expect(result.isError).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("uses program read and write scopes with destructive delete metadata", () => {
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_list_program_resources.scopes).toEqual(["program:read"]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_prepare_program_resource_file).toMatchObject({
      scopes: ["program:write"],
      riskTier: "CONTENT",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_create_program_resource.scopes).toEqual(["program:write"]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_update_program_resource.scopes).toEqual(["program:write"]);
    expect(TOOL_AUTHORIZATION_MANIFEST.growsurf_delete_program_resource).toMatchObject({
      scopes: ["program:write"],
      riskTier: "DESTRUCTIVE",
    });
  });

  it("keeps MCP Resource schemas aligned with the public contract", async () => {
    const server = createGrowSurfMcpServer({ env: {} });
    const client = new Client({ name: "program-resource-schema-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const advertised = JSON.stringify(tools.tools.filter((tool) => tool.name.includes("program_resource")));
      const output = JSON.stringify(TOOL_OUTPUT_SCHEMAS.growsurf_list_program_resources);

      expect(advertised).not.toContain("cloudName");
      expect(advertised).not.toContain("max_file_size");
      expect(advertised).not.toContain("moderation_status");
      expect(advertised).not.toContain('"moderation"');
      expect(advertised).toContain('"maxLength":120');
      expect(advertised).toContain('"minProperties":2');
      expect(advertised).toContain('"anyOf":[{"required":["type"]}');
      expect(output).toContain('"createdAt":{"type":"integer"');
      expect(output).toContain('"updatedAt":{"type":"integer"');
    } finally {
      await client.close();
      await server.close();
    }
  });
});
