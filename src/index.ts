#!/usr/bin/env node
/**
 * SMS Vert Pro — MCP Server (TypeScript)
 *
 * 9 tools for AI agents to send professional SMS via SMS Vert Pro.
 *
 * Prerequisites:
 *   1. Node.js 18+
 *   2. Create a free account at https://www.smsvertpro.com
 *   3. Generate your API Bearer token
 *   4. Set the SMSVERTPRO_API_TOKEN environment variable
 *
 * Usage:
 *   SMSVERTPRO_API_TOKEN=your_token npx @3-bees-online/mcp-server-smsvertpro
 *
 * @link https://www.smsvertpro.com/api-smsvertpro/
 * @link https://www.smsvertpro.com/integration-ia/
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Configuration ───────────────────────────────────────────────

const API_URL = "https://www.smsvertpro.com/api/v2/";
const API_TIMEOUT = 30_000;
const PHONE_REGEX = /^\d{10,15}$/;
const SENDER_REGEX = /^[a-zA-Z0-9 ]{1,11}$/;
const DELAY_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const OTP_CODE_REGEX = /^\d{4,8}$/;
const CAMPAIGN_ID_REGEX = /^[\w\-]+$/;
const MAX_MESSAGE_LENGTH = 918;

const apiToken = process.env.SMSVERTPRO_API_TOKEN?.trim();
if (!apiToken) {
  console.error(
    "[ERROR] SMSVERTPRO_API_TOKEN environment variable is not set.\n" +
      "Create an account at https://www.smsvertpro.com and generate your API token."
  );
  process.exit(1);
}

// ─── Validation ──────────────────────────────────────────────────

function validatePhone(number: string): string {
  const cleaned = number.trim().replace(/^\+/, "");
  if (!PHONE_REGEX.test(cleaned)) {
    throw new Error(
      `Invalid phone number: '${number}'. Expected: 10-15 digits without '+' (e.g. 33612345678)`
    );
  }
  return cleaned;
}

function validateSender(sender: string): string {
  const trimmed = sender.trim();
  if (!SENDER_REGEX.test(trimmed)) {
    throw new Error(
      `Invalid sender: '${sender}'. Max 11 alphanumeric characters.`
    );
  }
  return trimmed;
}

function validateCampaignId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed || !CAMPAIGN_ID_REGEX.test(trimmed)) {
    throw new Error(`Invalid campaign ID: '${id}'`);
  }
  return trimmed;
}

// ─── API Helper ──────────────────────────────────────────────────

async function callApi(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "ERROR", error: "API timeout (30s)" };
    }
    return {
      status: "REQUEST_ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── MCP Server ──────────────────────────────────────────────────

const server = new McpServer({
  name: "smsvertpro",
  version: "1.0.0",
});

// ─── Tool: send_sms ──────────────────────────────────────────────

server.tool(
  "send_sms",
  `Send an SMS to one or more recipients via SMS Vert Pro.
Phone numbers must be in international format without '+' (e.g. 33612345678).
Message is limited to 160 chars for 1 SMS (or 306 for 2 concatenated).
IMPORTANT: for marketing routes, add 'STOP 36173' at the end (legal requirement).
This is NOT added automatically by the API.`,
  {
    to: z.array(z.string()).describe("List of recipient phone numbers (e.g. ['33612345678'])"),
    message: z.string().describe("SMS text content"),
    sender: z.string().describe("Sender name (max 11 alphanumeric chars)"),
    delay: z
      .string()
      .optional()
      .describe("Scheduled send time (optional). Format: 'YYYY-MM-DD HH:MM'"),
  },
  async ({ to, message, sender, delay }) => {
    if (!to.length) {
      return { content: [{ type: "text", text: "Error: no recipients provided." }] };
    }

    try {
      const recipients = to.map(validatePhone);
      sender = validateSender(sender);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return { content: [{ type: "text", text: "Error: message is empty." }] };
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return {
        content: [
          {
            type: "text",
            text: `Error: message too long (${trimmedMessage.length} chars, max ${MAX_MESSAGE_LENGTH}).`,
          },
        ],
      };
    }

    const payload: Record<string, unknown> = {
      request: "send_sms",
      message: { sender, text: trimmedMessage },
      recipients: to.map((n) => n.trim().replace(/^\+/, "")),
    };

    if (delay) {
      const trimmedDelay = delay.trim();
      if (!DELAY_REGEX.test(trimmedDelay)) {
        return {
          content: [{ type: "text", text: "Error: invalid date format. Expected: 'YYYY-MM-DD HH:MM'" }],
        };
      }
      (payload.message as Record<string, unknown>).delay = trimmedDelay + ":00";
      (payload.message as Record<string, unknown>).delay_cancel = true;
    }

    const result = await callApi(payload);

    if (result.status === "SEND_OK") {
      return {
        content: [
          {
            type: "text",
            text: `SMS sent successfully.\nCampaign ID: ${result.id ?? "?"}\nRemaining credits: ${result.credits ?? "?"}\nSMS count: ${result.nbsms ?? "?"}\nDate: ${result.date ?? "?"}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text", text: `Send error: ${result.status ?? "Unknown"}\n${JSON.stringify(result)}` },
      ],
    };
  }
);

// ─── Tool: check_credits ─────────────────────────────────────────

server.tool(
  "check_credits",
  "Check the remaining SMS credit balance. 1 credit = 1 SMS of 160 characters.",
  {},
  async () => {
    const result = await callApi({ request: "credits" });
    if (result.credits !== undefined) {
      return {
        content: [{ type: "text", text: `Balance: ${result.credits} SMS credits available.` }],
      };
    }
    return { content: [{ type: "text", text: `Error: ${JSON.stringify(result)}` }] };
  }
);

// ─── Tool: get_delivery_report ───────────────────────────────────

server.tool(
  "get_delivery_report",
  "Get the delivery report for a sent SMS campaign.",
  {
    campaign_id: z.string().describe("The campaign ID returned by send_sms"),
  },
  async ({ campaign_id }) => {
    try {
      campaign_id = validateCampaignId(campaign_id);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }
    const result = await callApi({ request: "reports", campaign_id });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_responses ─────────────────────────────────────────

server.tool(
  "get_responses",
  "Get SMS replies received for a campaign (2-way SMS).",
  {
    campaign_id: z.string().describe("The campaign ID"),
  },
  async ({ campaign_id }) => {
    try {
      campaign_id = validateCampaignId(campaign_id);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }
    const result = await callApi({ request: "responses", campaign_id });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: verify_number ─────────────────────────────────────────

server.tool(
  "verify_number",
  "Verify phone number format for a contact list (syntax, length, country code).",
  {
    list_id: z.string().describe("The contact list ID to verify"),
  },
  async ({ list_id }) => {
    const cleaned = list_id.trim();
    if (!cleaned || !CAMPAIGN_ID_REGEX.test(cleaned)) {
      return {
        content: [{ type: "text", text: `Error: invalid list ID: '${list_id}'` }],
      };
    }
    const result = await callApi({
      request: "verify_numbers",
      liste_id: cleaned,
      action: "check",
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: get_blacklist ─────────────────────────────────────────

server.tool(
  "get_blacklist",
  "Get the list of phone numbers that sent STOP (unsubscribed). These numbers will no longer receive marketing SMS.",
  {},
  async () => {
    const result = await callApi({ request: "blacklist" });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Tool: generate_otp ─────────────────────────────────────────

server.tool(
  "generate_otp",
  "Generate and send a One-Time Password (OTP) via SMS for two-factor authentication.",
  {
    to: z.string().describe("Recipient phone number in international format (e.g. '33612345678')"),
    sender: z.string().describe("Sender name"),
  },
  async ({ to, sender }) => {
    try {
      to = validatePhone(to);
      sender = validateSender(sender);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }

    const result = await callApi({ request: "generate_otp", gsm: to, sender });

    if (result.status === "OTP_SENT") {
      return {
        content: [
          {
            type: "text",
            text: `OTP code sent via SMS to ${to}. Ask the user to enter the received code.`,
          },
        ],
      };
    }
    return { content: [{ type: "text", text: `OTP error: ${JSON.stringify(result)}` }] };
  }
);

// ─── Tool: verify_otp ────────────────────────────────────────────

server.tool(
  "verify_otp",
  "Verify an OTP code entered by the user.",
  {
    to: z.string().describe("Recipient phone number used during generation"),
    code: z.string().describe("The OTP code entered by the user"),
  },
  async ({ to, code }) => {
    try {
      to = validatePhone(to);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }

    const trimmedCode = code.trim();
    if (!OTP_CODE_REGEX.test(trimmedCode)) {
      return {
        content: [{ type: "text", text: "Error: invalid OTP code. Expected: 4-8 digits." }],
      };
    }

    const result = await callApi({ request: "verify_otp", gsm: to, code: trimmedCode });

    const status = result.status as string;
    if (status === "OK" || status === "OTP_TRUE") {
      return { content: [{ type: "text", text: "OTP code valid. Identity confirmed." }] };
    }
    if (status === "OTP_VERIFIED") {
      return {
        content: [
          { type: "text", text: `This OTP code was already verified on ${result.verified_at ?? "?"}.` },
        ],
      };
    }
    return {
      content: [{ type: "text", text: `OTP code invalid or expired. Status: ${status}` }],
    };
  }
);

// ─── Tool: cancel_sms ────────────────────────────────────────────

server.tool(
  "cancel_sms",
  `Cancel a scheduled SMS or an entire campaign.
Only pending SMS (scheduled) can be cancelled. Credits are automatically refunded.
IMPORTANT: campaign_id is ALWAYS required (returned by send_sms).
To cancel a specific SMS, also provide sms_id along with campaign_id.`,
  {
    campaign_id: z.string().describe("The campaign ID (returned by send_sms). REQUIRED."),
    sms_id: z
      .string()
      .optional()
      .describe("Optional. The ID of a specific SMS to cancel within the campaign."),
  },
  async ({ campaign_id, sms_id }) => {
    try {
      campaign_id = validateCampaignId(campaign_id);
    } catch (e) {
      return {
        content: [{ type: "text", text: `Validation error: ${(e as Error).message}` }],
      };
    }

    const payload: Record<string, unknown> = { request: "cancel", campaign_id };

    if (sms_id) {
      const trimmedSmsId = sms_id.trim();
      if (!CAMPAIGN_ID_REGEX.test(trimmedSmsId)) {
        return {
          content: [{ type: "text", text: `Error: invalid SMS ID: '${sms_id}'` }],
        };
      }
      payload.sms_id = trimmedSmsId;
    }

    const result = await callApi(payload);

    if (result.status === "CANCEL_OK") {
      return {
        content: [
          {
            type: "text",
            text: `Cancellation successful.\nCredits refunded. New balance: ${result.credits ?? "?"} credits.`,
          },
        ],
      };
    }
    if (result.status === "INVALID_SMS") {
      return {
        content: [{ type: "text", text: "Error: SMS not found or already sent." }],
      };
    }
    if (result.status === "NO_SMS_FOUND") {
      return {
        content: [{ type: "text", text: "Error: no pending SMS found for this campaign." }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Cancellation error: ${result.status ?? "Unknown"}\n${JSON.stringify(result)}`,
        },
      ],
    };
  }
);

// ─── Start ───────────────────────────────────────────────────────

async function main() {
  console.error("[SMS Vert Pro MCP] TypeScript server started.");
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
