# Discord Bot Agents

An intelligent Discord server-management **agent**. Understands natural language (any language), plans skills, executes them on Discord, then replies naturally from real results.

## Architecture (intelligence-first)

```
@Bot <request>   ← single standalone request (no chat memory)
        │
        ▼
 1. PLAN      (1× LLM)  — understand FULL intent, including multi-part / ambiguous
 2. EXECUTE   (Discord) — run all planned skills
 3. SUMMARIZE (1× LLM)  — reply in the user's language from real results
```

Typically **2 LLM calls** per command. Empty `@Bot` mention alone skips the LLM.

Why not 1 call? A model cannot both choose tools and write a grounded reply *after* seeing skill outcomes. Multi-intent (“who are you + list channels”) needs both phases.

| Layer | Path | Role |
|---|---|---|
| Discord adapter | `src/handler/messageHandler.js` | Mentions, cooldown, render |
| Agent | `src/agent/` | plan → execute → summarize |
| Skills | `src/skills/` | Discord actions (34 skills) |
| Providers | `src/core/providers/` | Gemini, Groq, Cohere, … + failover |
| Entity resolve | `src/utils/fuzzyMatch.js` | `#channel` / `@user` mentions, IDs, names |

## Features

- **Multi-intent & ambiguous requests** — planner covers every valid part of the message
- **Language-aware replies** — matches the user; English only when ambiguous
- **Mention-safe parsing** — Discord autocomplete (`<#ID>`, `<@ID>`), `#name`, raw IDs, and plain names
- **34 built-in skills** — channels, roles, members, moderation, emojis, invites, info queries, …
- **Multi-provider failover** — free-tier keys with automatic fallback and round-robin
- **Components V2 UIs** — paginated lists and rich layouts
- **Safety** — permission checks, hierarchy, owner protection, rate limits

## Supported AI Providers

| Provider | Env key(s) |
|---|---|
| Google Gemini | `GEMINI_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cohere | `COHERE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Cloudflare Workers AI | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |
| Jina | `JINA_API_KEY` |
| Comet API | `COMETAPI_API_KEY` |
| GitHub Models | `GITHUB_PATH_KEY` |

Only **one** provider key is required. Priority order lives in `src/config.js`.

## Setup

```bash
git clone https://github.com/fazelllyyy/discord-bot-agents.git
cd discord-bot-agents
npm install
cp .env.example .env
```

```env
DISCORD_TOKEN=your_discord_bot_token
BOT_NAME=My Bot
GEMINI_API_KEY=your_key_here
```

```bash
npm start
```

Requires Node.js 18+, a Discord bot token, and Message Content Intent enabled.

## Usage

```
@Bot siapa kamu? dan berikan list channel dalam server ini
@Bot create a red VIP role and give it to @user
@Bot jenis apa channel #general
@Bot timeout @user 10 minutes for spam
```

Each `@Bot` message is a **standalone** request (no conversation memory) — predictable and quota-friendly on free API keys.
