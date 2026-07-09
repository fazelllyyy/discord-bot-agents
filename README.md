# Discord Bot Agents

An intelligent Discord server management bot powered by multiple LLM providers. Understands natural language (English, Indonesian, and more) to manage channels, roles, members, emojis, invites, and server settings — autonomously.

## Features

- **Natural Language Commands** — "buat channel #general", "kick @user", "info server" — the bot understands intent and executes actions.
- **Two-Phase AI Architecture** — The AI first plans what actions to take (Phase 1: Plan), executes them, then crafts an accurate reply based on what actually happened (Phase 2: Summarize). No more optimistic replies.
- **Multi-Provider with Auto-Failover** — 10+ AI providers configured in priority order. If one fails (rate limit, timeout, outage), the next provider is automatically used. Round-robin load balancing spreads requests across providers.
- **34 Built-in Skills** — Channel management (create, delete, edit), role management (create, delete, edit, assign), member management (kick, ban, timeout, mute, deafen, move), message management (purge, send), emoji management, invite management, server info queries, and more.
- **Context-Aware** — Pre-fetches Discord server data before calling the AI, giving it full context about channels, roles, and members to minimize hallucinations.
- **Language Adaptive** — Automatically detects and replies in Indonesian, English, Arabic, Japanese, Russian, German, Spanish, French, Chinese, Korean, Portuguese.
- **Rich UI** — Uses Discord Components V2 for paginated lists, embeds with thumbnails, and media galleries.
- **Multi-Layer Safety** — AI-level validation rules, Discord permission checks, role hierarchy enforcement, rate limiting, 14-day message age enforcement, owner protection, self-moderation prevention.
- **Background Jobs** — Mass operations (e.g. add role to all members) run asynchronously with progress updates, retry logic, and timeout protection.

## Supported AI Providers

| Provider | Type | Free Tier | Config Key | Get Key |
|---|---|---|---|---|
| Google Gemini | `gemini` | ✅ | `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com/api-keys) |
| Groq | `groq` | ✅ | `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) |
| Cohere | `cohere` | ✅ | `COHERE_API_KEY` | [Cohere Dashboard](https://dashboard.cohere.com/api-keys) |
| Mistral AI | `mistral` | ✅ | `MISTRAL_API_KEY` | [Mistral Console](https://console.mistral.ai) |
| Cerebras | `cerebras` | ✅ | `CEREBRAS_API_KEY` | [Cerebras Cloud](https://cloud.cerebras.ai) |
| OpenRouter | `openrouter` | ✅ (some models) | `OPENROUTER_API_KEY` | [OpenRouter Keys](https://openrouter.ai/keys) |
| Cloudflare Workers AI | `cloudflare` | ✅ | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | [Cloudflare Dashboard](https://dash.cloudflare.com) |
| Jina AI | `jina` | ✅ | `JINA_API_KEY` | [Jina AI](https://jina.ai) |
| Comet API | `cometapi` | ✅ | `COMETAPI_API_KEY` | [CometAPI Token](https://api.cometapi.com/console/token) |
| GitHub Models | `github` | ✅ | `GITHUB_PATH_KEY` | [GitHub Models](https://github.com/marketplace/models) |

Only one provider key is needed to run the bot. Providers are tried in priority order (defined in `src/config.js`) with automatic fallback.

## Installation

### Prerequisites

- Node.js 18+
- npm
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- At least one AI provider API key

### Setup

```bash
# Clone the repository
git clone https://github.com/fazelllyyy/discord-bot-agents.git
cd discord-bot-agents

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

Edit `.env` with your Discord bot token and at least one AI provider key:

```env
DISCORD_TOKEN=your_discord_bot_token
BOT_NAME=My Bot

# At least one AI provider key
GEMINI_API_KEY=your_gemini_api_key
```

Start the bot:

```bash
node src/index.js
```

## Usage

Mention the bot in any channel it can see, followed by your command:

```
@Bot buat channel #general
@Bot timeout @user 10 menit karena spam
@Bot kick @user
@Bot list semua role
@Bot kasih role VIP ke @fazel
@Bot siapa pemilik server ini?
@Bot clear 50 pesan di #chat
@Bot pindah @user ke Voice General
```

### Multi-Step Commands

The bot can handle multiple actions in one request:

```
@Bot buat channel #rules dan kirim pesan selamat datang
@Bot buat role VIP warna merah dan kasih ke @fazel
@Bot mute @user1, deafen @user2, timeout @user3 5m
```

## Architecture

```
User @mention bot →
  │
  ├─ Pre-fetch: Gather Discord data (channels, roles, members)
  │
  ├─ Phase 1 — PLAN
  │   AI analyzes input, validates scope/permissions,
  │   determines actions → { reasoning, actions[] }
  │
  ├─ Execute: Run all actions sequentially (with validation)
  │
  ├─ Phase 2 — SUMMARIZE
  │   AI reviews actual execution results,
  │   crafts an accurate reply → { reply, format }
  │
  └─ Render: Send reply to Discord (text, embed, or CV2)
```

### Why Two-Phase?

| Aspect | 1-Phase (old) | 2-Phase (current) |
|---|---|---|
| LLM calls | 1 | 1-2 |
| Reply accuracy | Low (optimistic) | High (factual) |
| Error handling | Appended after reply | Built into reply |
| Self-correction | None | Reply reflects actual results |
| Prompt size | Very large | Split across phases |

## Project Structure

```
src/
├── index.js                    # Entry point — Discord client
├── config.js                   # Provider config, defaults, key collection
├── handler/
│   └── messageHandler.js       # Orchestrator: pre-fetch → Plan → Execute → Summarize → Render
├── core/
│   ├── ai.js                   # Phase 1 (planActions) + Phase 2 (summarizeResults)
│   ├── providerManager.js      # Multi-provider fallback + round-robin
│   └── providers/              # 12 individual AI provider adapters
├── skills/                     # 34 action/query modules
│   ├── index.js                # Skill registry + definitions for AI prompt
│   ├── addRoleToMember.js
│   ├── blockMember.js
│   ├── clearMessages.js
│   ├── createChannel.js
│   ├── createEmoji.js
│   ├── createInvite.js
│   ├── createRole.js
│   ├── deafenMember.js
│   ├── deleteChannel.js
│   ├── deleteEmoji.js
│   ├── deleteInvite.js
│   ├── deleteRole.js
│   ├── editChannel.js
│   ├── editEmoji.js
│   ├── editRole.js
│   ├── editServer.js
│   ├── getChannelInfo.js
│   ├── getRoleInfo.js
│   ├── getServerInfo.js
│   ├── getSnipe.js
│   ├── getUserInfo.js
│   ├── listChannels.js
│   ├── listEmojis.js
│   ├── listInvites.js
│   ├── listRoles.js
│   ├── moveMember.js
│   ├── muteMember.js
│   ├── removeMember.js
│   ├── removeRoleFromMember.js
│   ├── searchServer.js
│   ├── sendMessage.js
│   ├── setNickname.js
│   ├── timeoutMember.js
│   └── unblockMember.js
└── utils/                      # Helpers
    ├── errorMapper.js          # Discord API error → user-friendly message
    ├── fuzzyMatch.js           # Fuzzy channel/role name matching
    ├── jobManager.js           # Background mass job execution
    ├── jsonHelper.js           # Resilient JSON extraction from AI output
    └── retry.js                # Exponential backoff with timeout
```

## Available Skills

| Category | Skills |
|---|---|
| Channels | createChannel, deleteChannel, editChannel, listChannels, getChannelInfo |
| Roles | createRole, deleteRole, editRole, listRoles, getRoleInfo |
| Members | removeMember (kick), blockMember (ban), unblockMember, timeoutMember, setNickname, muteMember, deafenMember, moveMember, addRoleToMember, removeRoleFromMember |
| Messages | clearMessages (purge), sendMessage, getSnipe |
| Emojis | createEmoji, editEmoji, deleteEmoji, listEmojis |
| Invites | createInvite, deleteInvite, listInvites |
| Server | getServerInfo, editServer, searchServer |
| Users | getUserInfo |

## Configuration

Edit `src/config.js` to:

- Change provider priority order (providers are tried from top to bottom)
- Adjust `maxOutputTokens` and `temperature` per provider
- Set default language and greeting messages at the bottom of the file

### Provider Rotation

Providers support multiple API keys for load balancing and failover. To add a secondary key, append `_1` suffix to the environment variable (e.g. `GEMINI_API_KEY_1`). The system distributes requests across available keys in round-robin order automatically.

## Safety & Limitations

- **Rate Limited**: 2-second cooldown between commands per user
- **Max 5 Actions**: Complex requests are split into at most 5 actions
- **Mass Action Cap**: Background jobs process at most 50 items
- **Message Age**: Cannot delete messages older than 14 days (Discord API limit)
- **Hierarchy Enforced**: Cannot moderate users with roles at or above the bot's highest role
- **Owner Protected**: Cannot kick, ban, or timeout the server owner
- **Self-Moderation Blocked**: Cannot kick, ban, or timeout yourself
- **Admin Roles**: Cannot assign or edit Administrator roles (owner-only for security)
- **14-Day Edit Limit**: Discord blocks editing messages older than 14 days
- **Format Limitation**: Reply uses exactly one format (text or embed) — split-format requests are not supported

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT — see [LICENSE](LICENSE) for details.
