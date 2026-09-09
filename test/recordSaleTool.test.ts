import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrowSurfMcpServer } from "../src/index.js";

const originalFetch = globalThis.fetch;

describe("growsurf_record_sale", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it.each(["stripe", "chargebee", "recurly"].flatMap(provider =>
    ["growsurf_record_sale", "growsurf_refund_transaction"].map(name => ({ provider, name })),
  ))("$name preserves an explicit live $provider payment identity", async ({ provider, name }) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    globalThis.fetch = fetchMock as typeof fetch;
    const server = createGrowSurfMcpServer({ env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" } });
    const client = new Client({ name: "payment-scope-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const arguments_ = { participantId: "customer", paymentProvider: provider, transactionId: "payment-1",
        ...(name === "growsurf_record_sale" ? { currency: "USD", grossAmount: 1234 } : {}) };
      expect((await client.callTool({ name, arguments: arguments_ })).isError).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect((await client.callTool({ name, arguments: { ...arguments_, testMode: false } })).isError).not.toBe(true);
      const options = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
      expect(JSON.parse(String(options.body))).toMatchObject({ paymentProvider: provider, testMode: false, transactionId: "payment-1" });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("advertises and forwards the full transaction totals contract, including zero values", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "transaction_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const server = createGrowSurfMcpServer({
      env: { GROWSURF_API_KEY: "api_key", GROWSURF_CAMPAIGN_ID: "abc123" },
    });
    const client = new Client({ name: "record-sale-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((candidate) => candidate.name === "growsurf_record_sale");
      const properties = tool?.inputSchema.properties ?? {};

      for (const field of [
        "invoiceTotal",
        "invoiceTotalExcludingTax",
        "invoiceSubtotalExcludingTax",
        "totalTaxAmount",
        "totalTaxAmounts",
        "totalTaxes",
      ]) {
        expect(properties).toHaveProperty(field);
      }
      expect(properties.netAmount).toMatchObject({ minimum: 0 });
      expect(properties.amountCashNet).toMatchObject({ minimum: 0 });
      expect(properties.amountPaid).toMatchObject({ minimum: 0 });

      const result = await client.callTool({
        name: "growsurf_record_sale",
        arguments: {
          participantEmail: "buyer@example.com",
          currency: "USD",
          grossAmount: 1000,
          externalId: "sale_123",
          netAmount: 0,
          amountCashNet: 0,
          amountPaid: 0,
          invoiceTotal: 0,
          invoiceTotalExcludingTax: 0,
          invoiceSubtotalExcludingTax: 0,
          totalTaxAmount: 0,
          totalTaxAmounts: [{ amount: 0, rate: 0.2 }],
          totalTaxes: [{ amount: 0, name: "VAT" }],
        },
      });

      expect(result.isError).not.toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.growsurf.com/v2/campaign/abc123/participant/buyer%40example.com/transaction",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            currency: "USD",
            grossAmount: 1000,
            externalId: "sale_123",
            netAmount: 0,
            amountCashNet: 0,
            amountPaid: 0,
            invoiceTotal: 0,
            invoiceTotalExcludingTax: 0,
            invoiceSubtotalExcludingTax: 0,
            totalTaxAmount: 0,
            totalTaxAmounts: [{ amount: 0, rate: 0.2 }],
            totalTaxes: [{ amount: 0, name: "VAT" }],
          }),
        }),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
