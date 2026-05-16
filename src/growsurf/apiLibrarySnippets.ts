import { z } from "zod";

export const apiLibrarySnippetsInputSchema = z.object({
  language: z.enum(["typescript", "python", "php", "ruby", "java", "all"]).default("all"),
  workflow: z
    .enum([
      "setup",
      "campaign_lookup",
      "add_participant",
      "trigger_referral",
      "record_transaction",
      "mobile_participant_token",
      "all",
    ])
    .default("all"),
  campaignId: z.string().min(1).optional(),
  participantIdOrEmail: z.string().min(1).optional(),
});

export type ApiLibrarySnippetsInput = z.infer<typeof apiLibrarySnippetsInputSchema>;

export type ApiLibrarySnippetsContext = {
  campaignId?: string | undefined;
};

type Language = Exclude<ApiLibrarySnippetsInput["language"], "all">;
type Workflow = Exclude<ApiLibrarySnippetsInput["workflow"], "all">;

const codeBlock = (language: string, code: string): string => ["```" + language, code, "```"].join("\n");

const placeholder = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const shouldRenderLanguage = (input: ApiLibrarySnippetsInput, language: Language) =>
  input.language === "all" || input.language === language;

const shouldRenderWorkflow = (input: ApiLibrarySnippetsInput, workflow: Workflow) =>
  input.workflow === "all" || input.workflow === workflow;

const renderTypeScript = (input: ApiLibrarySnippetsInput, campaignId: string, participant: string) => {
  const sections: string[] = ["### TypeScript (`growsurf-typescript` 0.2.0+)"];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock(
        "sh",
        "npm install growsurf-typescript",
      ),
      codeBlock(
        "ts",
        [
          "import Growsurf from \"growsurf-typescript\";",
          "",
          "const client = new Growsurf({",
          "  apiKey: process.env.GROWSURF_API_KEY,",
          "});",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "campaign_lookup")) {
    sections.push(codeBlock("ts", `const campaign = await client.campaign.retrieve(${JSON.stringify(campaignId)});`));
  }
  if (shouldRenderWorkflow(input, "add_participant")) {
    sections.push(
      codeBlock(
        "ts",
        [
          `const participant = await client.campaign.participant.add(${JSON.stringify(campaignId)}, {`,
          "  email: \"person@example.com\",",
          "  firstName: \"Ada\",",
          "  lastName: \"Lovelace\",",
          "});",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "trigger_referral")) {
    sections.push(
      codeBlock(
        "ts",
        `await client.campaign.participant.triggerReferral(${JSON.stringify(participant)}, { id: ${JSON.stringify(campaignId)} });`,
      ),
    );
  }
  if (shouldRenderWorkflow(input, "record_transaction")) {
    sections.push(
      codeBlock(
        "ts",
        [
          `await client.campaign.participant.recordTransaction(${JSON.stringify(participant)}, {`,
          `  id: ${JSON.stringify(campaignId)},`,
          "  currency: \"USD\",",
          "  grossAmount: 9900,",
          "  invoiceId: \"invoice_123\",",
          "});",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "mobile_participant_token")) {
    sections.push(
      codeBlock(
        "ts",
        [
          `const token = await client.campaign.participant.createMobileToken(${JSON.stringify(participant)}, {`,
          `  id: ${JSON.stringify(campaignId)},`,
          "});",
          "",
          "console.log(token.participantToken, token.expiresIn);",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderPython = (input: ApiLibrarySnippetsInput, campaignId: string, participant: string) => {
  const sections: string[] = ["### Python (`growsurf-python` 0.2.0+)"];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock("sh", "pip install growsurf-python"),
      codeBlock(
        "python",
        [
          "import os",
          "from growsurf import Growsurf",
          "",
          "client = Growsurf(api_key=os.environ.get(\"GROWSURF_API_KEY\"))",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "campaign_lookup")) {
    sections.push(codeBlock("python", `campaign = client.campaign.retrieve(${JSON.stringify(campaignId)})`));
  }
  if (shouldRenderWorkflow(input, "add_participant")) {
    sections.push(
      codeBlock(
        "python",
        [
          `participant = client.campaign.participant.add(${JSON.stringify(campaignId)},`,
          "    email=\"person@example.com\",",
          "    first_name=\"Ada\",",
          "    last_name=\"Lovelace\",",
          ")",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "trigger_referral")) {
    sections.push(
      codeBlock("python", `client.campaign.participant.trigger_referral(${JSON.stringify(participant)}, id=${JSON.stringify(campaignId)})`),
    );
  }
  if (shouldRenderWorkflow(input, "record_transaction")) {
    sections.push(
      codeBlock(
        "python",
        [
          `client.campaign.participant.record_transaction(${JSON.stringify(participant)},`,
          `    id=${JSON.stringify(campaignId)},`,
          "    currency=\"USD\",",
          "    gross_amount=9900,",
          "    invoice_id=\"invoice_123\",",
          ")",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "mobile_participant_token")) {
    sections.push(
      codeBlock(
        "python",
        [
          `token = client.campaign.participant.create_mobile_token(${JSON.stringify(participant)}, id=${JSON.stringify(campaignId)})`,
          "print(token.participant_token, token.expires_in)",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderPhp = (input: ApiLibrarySnippetsInput, campaignId: string, participant: string) => {
  const sections: string[] = ["### PHP (`growsurf/growsurf-php` 0.3.0+)"];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock(
        "json",
        [
          "{",
          "  \"repositories\": [{ \"type\": \"vcs\", \"url\": \"git@github.com:growsurf/growsurf-php.git\" }],",
          "  \"require\": { \"growsurf/growsurf-php\": \"dev-main\" }",
          "}",
        ].join("\n"),
      ),
      codeBlock(
        "php",
        [
          "<?php",
          "",
          "use Growsurf\\Client;",
          "",
          "$client = new Client(apiKey: getenv('GROWSURF_API_KEY') ?: 'My API Key');",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "campaign_lookup")) {
    sections.push(codeBlock("php", `$campaign = $client->campaign->retrieve(${JSON.stringify(campaignId)});`));
  }
  if (shouldRenderWorkflow(input, "add_participant")) {
    sections.push(
      codeBlock(
        "php",
        `$participant = $client->campaign->participant->add(${JSON.stringify(campaignId)}, email: 'person@example.com', firstName: 'Ada', lastName: 'Lovelace');`,
      ),
    );
  }
  if (shouldRenderWorkflow(input, "trigger_referral")) {
    sections.push(
      codeBlock("php", `$client->campaign->participant->triggerReferral(${JSON.stringify(participant)}, ${JSON.stringify(campaignId)});`),
    );
  }
  if (shouldRenderWorkflow(input, "record_transaction")) {
    sections.push(
      codeBlock(
        "php",
        [
          `$client->campaign->participant->recordTransaction(${JSON.stringify(participant)}, ${JSON.stringify(campaignId)},`,
          "    currency: 'USD',",
          "    grossAmount: 9900,",
          "    invoiceID: 'invoice_123',",
          ");",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "mobile_participant_token")) {
    sections.push(
      codeBlock(
        "php",
        [
          `$token = $client->campaign->participant->createMobileToken(${JSON.stringify(participant)}, ${JSON.stringify(campaignId)});`,
          "echo $token->participantToken;",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderRuby = (input: ApiLibrarySnippetsInput, campaignId: string, participant: string) => {
  const sections: string[] = ["### Ruby (`growsurf-ruby` 0.2.0+)"];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock("ruby", "gem \"growsurf-ruby\", \"~> 0.2.0\""),
      codeBlock(
        "ruby",
        [
          "require \"growsurf_ruby\"",
          "",
          "growsurf = GrowsurfRuby::Client.new(api_key: ENV[\"GROWSURF_API_KEY\"])",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "campaign_lookup")) {
    sections.push(codeBlock("ruby", `campaign = growsurf.campaign.retrieve(${JSON.stringify(campaignId)})`));
  }
  if (shouldRenderWorkflow(input, "add_participant")) {
    sections.push(
      codeBlock(
        "ruby",
        [
          `participant = growsurf.campaign.participant.add(${JSON.stringify(campaignId)},`,
          "  email: \"person@example.com\",",
          "  first_name: \"Ada\",",
          "  last_name: \"Lovelace\"",
          ")",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "trigger_referral")) {
    sections.push(codeBlock("ruby", `growsurf.campaign.participant.trigger_referral(${JSON.stringify(participant)}, id: ${JSON.stringify(campaignId)})`));
  }
  if (shouldRenderWorkflow(input, "record_transaction")) {
    sections.push(
      codeBlock(
        "ruby",
        [
          `growsurf.campaign.participant.record_transaction(${JSON.stringify(participant)},`,
          `  id: ${JSON.stringify(campaignId)},`,
          "  currency: \"USD\",",
          "  gross_amount: 9900,",
          "  invoice_id: \"invoice_123\"",
          ")",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "mobile_participant_token")) {
    sections.push(
      codeBlock(
        "ruby",
        [
          `token = growsurf.campaign.participant.create_mobile_token(${JSON.stringify(participant)}, id: ${JSON.stringify(campaignId)})`,
          "puts token.participant_token",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderJava = (input: ApiLibrarySnippetsInput, campaignId: string, participant: string) => {
  const sections: string[] = ["### Java (`com.growsurf.api:growsurf-java` 0.3.0+)"];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock("kotlin", "implementation(\"com.growsurf.api:growsurf-java:0.3.0\")"),
      codeBlock(
        "java",
        [
          "import com.growsurf.api.client.GrowsurfClient;",
          "import com.growsurf.api.client.okhttp.GrowsurfOkHttpClient;",
          "",
          "GrowsurfClient client = GrowsurfOkHttpClient.fromEnv();",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "campaign_lookup")) {
    sections.push(codeBlock("java", `var campaign = client.campaign().retrieve(${JSON.stringify(campaignId)});`));
  }
  if (shouldRenderWorkflow(input, "add_participant")) {
    sections.push(
      codeBlock(
        "java",
        [
          "import com.growsurf.api.models.campaign.participant.ParticipantAddParams;",
          "",
          "var participant = client.campaign().participant().add(",
          `    ${JSON.stringify(campaignId)},`,
          "    ParticipantAddParams.builder()",
          "        .email(\"person@example.com\")",
          "        .firstName(\"Ada\")",
          "        .lastName(\"Lovelace\")",
          "        .build()",
          ");",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "trigger_referral")) {
    sections.push(
      codeBlock(
        "java",
        [
          "import com.growsurf.api.models.campaign.participant.ParticipantTriggerReferralParams;",
          "",
          "client.campaign().participant().triggerReferral(",
          `    ${JSON.stringify(participant)},`,
          `    ParticipantTriggerReferralParams.builder().id(${JSON.stringify(campaignId)}).build()`,
          ");",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "record_transaction")) {
    sections.push(
      codeBlock(
        "java",
        [
          "import com.growsurf.api.models.campaign.participant.ParticipantRecordTransactionParams;",
          "",
          "client.campaign().participant().recordTransaction(",
          `    ${JSON.stringify(participant)},`,
          "    ParticipantRecordTransactionParams.builder()",
          `        .id(${JSON.stringify(campaignId)})`,
          "        .currency(\"USD\")",
          "        .grossAmount(9900L)",
          "        .invoiceId(\"invoice_123\")",
          "        .build()",
          ");",
        ].join("\n"),
      ),
    );
  }
  if (shouldRenderWorkflow(input, "mobile_participant_token")) {
    sections.push(
      codeBlock(
        "java",
        [
          "import com.growsurf.api.models.campaign.participant.ParticipantCreateMobileTokenParams;",
          "",
          "var token = client.campaign().participant().createMobileToken(",
          `    ${JSON.stringify(participant)},`,
          `    ParticipantCreateMobileTokenParams.builder().id(${JSON.stringify(campaignId)}).build()`,
          ");",
          "",
          "System.out.println(token.participantToken());",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

export const renderApiLibrarySnippets = (input: ApiLibrarySnippetsInput, context: ApiLibrarySnippetsContext = {}) => {
  const campaignId = placeholder(input.campaignId ?? context.campaignId, "YOUR_CAMPAIGN_ID");
  const participant = placeholder(input.participantIdOrEmail, "participant@example.com");
  const sections: string[] = [
    "## GrowSurf REST API library snippets",
    "",
    "- These official libraries are for server-side REST API integrations.",
    "- Do not ship your REST API key in native mobile apps.",
    "- The generated libraries include `Create Mobile Participant Token` for existing signed-in mobile users.",
    "",
  ];

  if (shouldRenderLanguage(input, "typescript")) sections.push(renderTypeScript(input, campaignId, participant));
  if (shouldRenderLanguage(input, "python")) sections.push(renderPython(input, campaignId, participant));
  if (shouldRenderLanguage(input, "php")) sections.push(renderPhp(input, campaignId, participant));
  if (shouldRenderLanguage(input, "ruby")) sections.push(renderRuby(input, campaignId, participant));
  if (shouldRenderLanguage(input, "java")) sections.push(renderJava(input, campaignId, participant));

  return sections.join("\n");
};
