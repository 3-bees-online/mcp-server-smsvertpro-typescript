<p align="center">
  <img src="logo.png" alt="SMS Vert Pro" width="220" />
</p>

# SMS Vert Pro — MCP Server (TypeScript)

MCP server in TypeScript to send professional SMS via [SMS Vert Pro](https://www.smsvertpro.com) from any AI agent: Claude, ChatGPT, Cursor, Windsurf, etc.

> Also available in [Python](https://github.com/3-bees-online/mcp-server-smsvertpro-python) and [PHP](https://github.com/3-bees-online/mcp-server-smsvertpro-php)

## Quick Start (30 seconds)

```bash
SMSVERTPRO_API_TOKEN=your_token npx @3-bees-online/mcp-server-smsvertpro
```

That's it. No git clone, no build step.

## Prerequisites

1. **Node.js 18+**
2. **A SMS Vert Pro account** — [free signup](https://www.smsvertpro.com/espace-client/?type=1) (10 free SMS)
3. **An API Bearer token** — generate it from your account

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "smsvertpro": {
      "command": "npx",
      "args": ["@3-bees-online/mcp-server-smsvertpro"],
      "env": {
        "SMSVERTPRO_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add smsvertpro -- npx @3-bees-online/mcp-server-smsvertpro
```

### Cursor / Windsurf

Add the MCP configuration in your editor settings, pointing to `npx @3-bees-online/mcp-server-smsvertpro` with the `SMSVERTPRO_API_TOKEN` environment variable.

## Available Tools (9)

| Tool | Description |
|---|---|
| `send_sms` | Send an SMS (immediate or scheduled) |
| `check_credits` | Check SMS credit balance |
| `get_delivery_report` | Delivery report for a campaign |
| `get_responses` | SMS replies received (2-way SMS) |
| `verify_number` | Verify phone number format |
| `get_blacklist` | Unsubscribe list (STOP) |
| `generate_otp` | Send an OTP code via SMS |
| `verify_otp` | Verify an OTP code |
| `cancel_sms` | Cancel a scheduled SMS or campaign |

## Usage Examples

Once the MCP server is connected, simply ask your AI agent:

- *"Send an SMS to 33612345678 to announce our spring sale -20%"*
- *"How many SMS credits do I have left?"*
- *"Check if the SMS from campaign 12345 was delivered"*
- *"Send an OTP code to 33698765432 to confirm the signup"*
- *"Cancel campaign camp_334_1234"*

The AI agent will automatically use the right tools with the right parameters.

## Phone Number Format

Phone numbers must be in **international format without `+`**:
- France: `33612345678` (not `0612345678`, not `+33612345678`)
- Belgium: `32470123456`
- Switzerland: `41791234567`

## Security

- Input validation (phone numbers, sender, OTP codes, dates)
- Your API token stays on your machine, never shared with the AI agent
- The server only communicates with `https://www.smsvertpro.com/api/v2/`
- For marketing SMS, add `STOP 36173` at the end of the message (legal requirement)

## Local Development

```bash
git clone https://github.com/3-bees-online/mcp-server-smsvertpro-typescript.git
cd mcp-server-smsvertpro-typescript
npm install
npm run build
SMSVERTPRO_API_TOKEN=your_token npm start
```

## Links

- [SMS Vert Pro](https://www.smsvertpro.com)
- [API V2 Documentation](https://www.smsvertpro.com/api-smsvertpro/)
- [AI Integration Guide](https://www.smsvertpro.com/integration-ia/)
- [Pricing](https://www.smsvertpro.com/tarifs/)
- [Python version](https://github.com/3-bees-online/mcp-server-smsvertpro-python)
- [PHP version](https://github.com/3-bees-online/mcp-server-smsvertpro-php)

## License

MIT — See [LICENSE](LICENSE)
