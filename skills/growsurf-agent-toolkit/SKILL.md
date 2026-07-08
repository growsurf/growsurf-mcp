---
name: growsurf-agent-toolkit
description: Use when an agent needs to create, configure, verify, or operate a GrowSurf referral or affiliate program through the GrowSurf MCP/REST API. Triggers include "create a referral program", "create an affiliate program", "set up GrowSurf", "embed the referral widget", "configure rewards", "wire webhooks", "show screenshots", "verify my program", or "read GrowSurf analytics".
---

# GrowSurf Agent Toolkit

Use this skill to turn a user goal into a real GrowSurf program, not just API calls. Prefer the GrowSurf MCP tools when available; otherwise use the REST v2 API with the same order and checks.

## Ground Rules

- Use the user's own GrowSurf API key. If they do not have an account, call `growsurf_create_account`, give them the verification step, and pause until the key is usable.
- After `growsurf_create_campaign`, pass the returned `id` as `campaignId` to every campaign-scoped tool. Do not rely on a process-level default after creating a new program.
- Campaign create seeds type-specific starter content across Design, Emails, Options, Installation, rewards, and the GrowSurf Window. Fetch and review it before patching. Preserve starter content unless the user asks for a specific change.
- Keep rewards conservative until the user confirms money movement, payout funding, tax collection, and approval settings.
- Fetch before patching large config surfaces. Use `growsurf_get_campaign_design`, `growsurf_get_campaign_emails`, `growsurf_get_campaign_options`, or `growsurf_get_campaign_installation`, then patch only the fields that must change.
- Finish by proving what changed: fetch the campaign, fetch key configs, and call `growsurf_get_referral_flow_screenshots`.

## Referral Program Workflow

1. Create the program:
   - Tool: `growsurf_create_campaign`
   - Minimum body: `{ "type": "REFERRAL", "name": "...", "companyName": "..." }`
   - Capture the returned `id`.

2. Inspect defaults:
   - `growsurf_get_campaign` with `campaignId`
   - `growsurf_list_campaign_rewards`
   - `growsurf_get_campaign_design`
   - `growsurf_get_campaign_emails`
   - `growsurf_get_campaign_options`
   - Check GrowSurf Window header/share copy, referred-friend and landing-page content, email templates, rewards, and install settings.

3. Configure only what the user requested:
   - Design: brand colors, copy, GrowSurf Window sections, share channels, landing-page/referred-friend experience.
   - Emails: participant lifecycle email copy and enabled states.
   - Options: approval, fraud, referral cookie/credit windows, notification emails.
   - Installation: share URL, tracking method, referral trigger.

4. Confirm:
   - `growsurf_get_referral_flow_screenshots`
   - Summarize the referrer view, referred-friend view, reward state, install step, and any user action still needed.

## Affiliate Program Workflow

1. Create the program:
   - Tool: `growsurf_create_campaign`
   - Minimum body: `{ "type": "AFFILIATE", "name": "...", "companyName": "...", "currencyISO": "USD" }`
   - Capture the returned `id`.

2. Inspect the default commission and payout posture:
   - `growsurf_list_campaign_rewards`
   - `growsurf_get_campaign_options`
   - `growsurf_get_campaign_design`
   - Check starter content for the affiliate portal, GrowSurf Window, commissions, payouts, participant settings, and email templates.

3. Configure carefully:
   - Confirm commission basis, payout threshold, refund/hold period, participant auth, payout instructions, and tax-document collection before enabling anything that can create payable obligations.
   - Patch Options before publishing if the default payout/tax settings do not match the user's business.
   - Patch Design for affiliate portal sections: affiliate summary, commissions, payouts, participant settings, leaderboard.

4. Confirm:
   - `growsurf_get_referral_flow_screenshots`
   - Summarize commission defaults, payout/tax readiness, portal sections, and remaining launch blockers.

## Common Tasks

### Embed The Widget

Use `growsurf_integration_guide` for the user's stack. If no stack is known, give the universal install snippet and ask where their signup event happens. Verify the installed script with the campaign's Installation config and the user's site URL when available. When placing or styling a GrowSurf Window launcher or embeddable element inside the user's app, use `frontend-design` or the closest available design-focused workflow before changing UI.

### Adjust Rewards

Use `growsurf_list_campaign_rewards` first. Prefer updating existing reward configs over creating duplicates. For new rewards, state whether the reward is visible, active, referrer-only or double-sided, and whether the value has tax-reporting implications.

### Wire Webhooks

Use `growsurf_list_campaign_webhooks`, then create or update with the exact event list the user requested. Use `growsurf_test_campaign_webhook` after saving. Never expose or echo webhook secrets.

### Read Analytics

Use `growsurf_get_campaign_analytics`. Add `include=rates,statusCounts` when the user asks "how is it performing?" Add an interval only when a trend is needed.

## Final Response Checklist

Include:

- Program type, name, and `campaignId`
- What was created or changed
- Reward and money-movement posture
- Installation or launch action still needed
- Screenshot URLs from `growsurf_get_referral_flow_screenshots`
- Campaign Editor URL when the user wants to inspect design defaults
