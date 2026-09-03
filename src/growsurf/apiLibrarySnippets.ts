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
  email: z.string().min(3).optional(),
  referredBy: z.string().min(1).optional(),
  participantIdOrEmail: z.string().min(1).optional(),
});

export type ApiLibrarySnippetsInput = z.infer<typeof apiLibrarySnippetsInputSchema>;

export type ApiLibrarySnippetsContext = {
  campaignId?: string | undefined;
};

type Language = Exclude<ApiLibrarySnippetsInput["language"], "all">;
type Workflow = Exclude<ApiLibrarySnippetsInput["workflow"], "all">;

const REST_API_LIBRARY_VERSION = "1.4.0";
const FIXTURE_EMAIL = "gavin@hooli.com";
const FIXTURE_FIRST_NAME = "Gavin";
const FIXTURE_LAST_NAME = "Belson";

const codeBlock = (language: string, code: string): string => ["```" + language, code, "```"].join("\n");

const placeholder = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const shouldRenderLanguage = (input: ApiLibrarySnippetsInput, language: Language) =>
  input.language === "all" || input.language === language;

const shouldRenderWorkflow = (input: ApiLibrarySnippetsInput, workflow: Workflow) =>
  input.workflow === "all" || input.workflow === workflow;

const renderTypeScript = (
  input: ApiLibrarySnippetsInput,
  campaignId: string,
  participant: string,
  mobileEmail: string,
  referredBy: string,
) => {
  const sections: string[] = [`### TypeScript (\`growsurf-typescript\` ${REST_API_LIBRARY_VERSION}+)`];
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
          `  email: ${JSON.stringify(FIXTURE_EMAIL)},`,
          `  firstName: ${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `  lastName: ${JSON.stringify(FIXTURE_LAST_NAME)},`,
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
          `const token = await client.campaign.createMobileParticipantToken(${JSON.stringify(campaignId)}, {`,
          `  email: ${JSON.stringify(mobileEmail)},`,
          "  firstName: \"Gavin\",",
          "  lastName: \"Belson\",",
          `  referredBy: ${JSON.stringify(referredBy)},`,
          "  mobileInstanceId: \"5f7d0f4c-3e7c-4aa9-8c41-d81d998f0bb1\",",
          "});",
          "",
          "console.log(token.participantToken, token.expiresIn, token.isNew);",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderPython = (
  input: ApiLibrarySnippetsInput,
  campaignId: string,
  participant: string,
  mobileEmail: string,
  referredBy: string,
) => {
  const sections: string[] = [`### Python (\`growsurf-python\` ${REST_API_LIBRARY_VERSION}+)`];
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
          `    email=${JSON.stringify(FIXTURE_EMAIL)},`,
          `    first_name=${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `    last_name=${JSON.stringify(FIXTURE_LAST_NAME)},`,
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
          `token = client.campaign.create_mobile_participant_token(${JSON.stringify(campaignId)},`,
          `    email=${JSON.stringify(mobileEmail)},`,
          "    first_name=\"Gavin\",",
          "    last_name=\"Belson\",",
          `    referred_by=${JSON.stringify(referredBy)},`,
          "    mobile_instance_id=\"5f7d0f4c-3e7c-4aa9-8c41-d81d998f0bb1\",",
          ")",
          "print(token.participant_token, token.expires_in, token.is_new)",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderPhp = (
  input: ApiLibrarySnippetsInput,
  campaignId: string,
  participant: string,
  mobileEmail: string,
  referredBy: string,
) => {
  const sections: string[] = [`### PHP (\`growsurf/growsurf-php\` ${REST_API_LIBRARY_VERSION}+)`];
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
        `$participant = $client->campaign->participant->add(${JSON.stringify(campaignId)}, email: '${FIXTURE_EMAIL}', firstName: '${FIXTURE_FIRST_NAME}', lastName: '${FIXTURE_LAST_NAME}');`,
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
          "$token = $client->campaign->createMobileParticipantToken(",
          `    ${JSON.stringify(campaignId)},`,
          `    ${JSON.stringify(mobileEmail)},`,
          "    firstName: 'Gavin',",
          "    lastName: 'Belson',",
          "    mobileInstanceID: '5f7d0f4c-3e7c-4aa9-8c41-d81d998f0bb1',",
          `    referredBy: ${JSON.stringify(referredBy)},`,
          ");",
          "echo $token->participantToken;",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderRuby = (
  input: ApiLibrarySnippetsInput,
  campaignId: string,
  participant: string,
  mobileEmail: string,
  referredBy: string,
) => {
  const sections: string[] = [`### Ruby (\`growsurf-ruby\` ${REST_API_LIBRARY_VERSION}+)`];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock("ruby", `gem \"growsurf-ruby\", \"~> ${REST_API_LIBRARY_VERSION}\"`),
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
          `  email: ${JSON.stringify(FIXTURE_EMAIL)},`,
          `  first_name: ${JSON.stringify(FIXTURE_FIRST_NAME)},`,
          `  last_name: ${JSON.stringify(FIXTURE_LAST_NAME)}`,
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
          `token = growsurf.campaign.create_mobile_participant_token(${JSON.stringify(campaignId)},`,
          `  email: ${JSON.stringify(mobileEmail)},`,
          "  first_name: \"Gavin\",",
          "  last_name: \"Belson\",",
          `  referred_by: ${JSON.stringify(referredBy)},`,
          "  mobile_instance_id: \"5f7d0f4c-3e7c-4aa9-8c41-d81d998f0bb1\"",
          ")",
          "puts token.participant_token",
        ].join("\n"),
      ),
    );
  }
  return sections.join("\n\n");
};

const renderJava = (
  input: ApiLibrarySnippetsInput,
  campaignId: string,
  participant: string,
  mobileEmail: string,
  referredBy: string,
) => {
  const sections: string[] = [`### Java (\`com.growsurf.api:growsurf-java\` ${REST_API_LIBRARY_VERSION}+)`];
  if (shouldRenderWorkflow(input, "setup")) {
    sections.push(
      codeBlock("kotlin", `implementation(\"com.growsurf.api:growsurf-java:${REST_API_LIBRARY_VERSION}\")`),
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
          `        .email(${JSON.stringify(FIXTURE_EMAIL)})`,
          `        .firstName(${JSON.stringify(FIXTURE_FIRST_NAME)})`,
          `        .lastName(${JSON.stringify(FIXTURE_LAST_NAME)})`,
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
          "import com.growsurf.api.models.campaign.CampaignCreateMobileParticipantTokenParams;",
          "import com.growsurf.api.models.campaign.participant.Create;",
          "",
          "var token = client.campaign().createMobileParticipantToken(",
          `    ${JSON.stringify(campaignId)},`,
          "    CampaignCreateMobileParticipantTokenParams.builder()",
          "        .create(",
          "            Create.builder()",
          `                .email(${JSON.stringify(mobileEmail)})`,
          "                .firstName(\"Gavin\")",
          "                .lastName(\"Belson\")",
          `                .referredBy(${JSON.stringify(referredBy)})`,
          "                .mobileInstanceId(\"5f7d0f4c-3e7c-4aa9-8c41-d81d998f0bb1\")",
          "                .build()",
          "        )",
          "        .build()",
          ");",
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
  const mobileEmail = placeholder(input.email, "participant@example.com");
  const referredBy = placeholder(input.referredBy, "referrer_id");
  const sections: string[] = [
    "## GrowSurf REST API library snippets",
    "",
    "- These official libraries are for server-side REST API integrations.",
    "- Do not ship your REST API key in native mobile apps.",
    "- Use the library's `Create Mobile Participant Token` method after your app authenticates the signed-in user.",
    "",
  ];

  if (shouldRenderLanguage(input, "typescript")) sections.push(renderTypeScript(input, campaignId, participant, mobileEmail, referredBy));
  if (shouldRenderLanguage(input, "python")) sections.push(renderPython(input, campaignId, participant, mobileEmail, referredBy));
  if (shouldRenderLanguage(input, "php")) sections.push(renderPhp(input, campaignId, participant, mobileEmail, referredBy));
  if (shouldRenderLanguage(input, "ruby")) sections.push(renderRuby(input, campaignId, participant, mobileEmail, referredBy));
  if (shouldRenderLanguage(input, "java")) sections.push(renderJava(input, campaignId, participant, mobileEmail, referredBy));

  return sections.join("\n");
};
