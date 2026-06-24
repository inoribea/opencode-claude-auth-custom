# opencode-claude-auth

[![npm](https://img.shields.io/npm/v/opencode-claude-auth)](https://www.npmjs.com/package/opencode-claude-auth)

Self-contained Anthropic auth provider for OpenCode — uses Claude Code credentials, manual API keys, or custom proxy endpoints.

> **Forked from [griffinmartin/opencode-claude-auth](https://github.com/griffinmartin/opencode-claude-auth)**
> ([MIT](https://github.com/griffinmartin/opencode-claude-auth/blob/main/LICENSE))
> with additions: manual API key input via `opencode auth login`, custom base URL support,
> and macOS Keychain raw API key fallback.

## What's different from upstream

| Feature | Upstream | This fork |
|---|---|---|
| **Manual API key** | ❌ | ✅ `opencode auth login` → "Manual API Key" |
| **Custom base URL** | ❌ | ✅ `ANTHROPIC_BASE_URL` env var / agent config |
| **Raw Keychain key** | Only OAuth `-credentials` entries | ✅ Falls back to bare `Claude Code` service |
| **Agent-level config** | `enable1mContext` only | + `apiKey`, `baseUrl` |

## Quick start

### Option A: Manual API Key (recommended)

```bash
opencode auth login
```

Select **Anthropic** → **Manual API Key** → paste your key. No plaintext in `opencode.json`.

### Option B: Environment variables

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-api03-..."
$env:ANTHROPIC_BASE_URL = "https://your-proxy.com/v1"  # optional
```

### Option C: Agent config

```json
{
  "agent": {
    "build": {
      "apiKey": "sk-ant-api03-...",
      "baseUrl": "https://your-proxy.com/v1"
    }
  }
}
```

Priority: `opencode auth login` > env var > agent config > Keychain.

## Credential sources

The plugin checks these in order:

1. **Manual API Key** — set via `opencode auth login` or `ANTHROPIC_API_KEY` env var. Stored as `type:"api"` in `auth.json`.
2. **macOS Keychain** — all `Claude Code-credentials*` entries (OAuth) + bare `Claude Code` entry (raw API key)
3. **`~/.claude/.credentials.json`** — fallback, works on all platforms

## Custom base URL (proxy)

Use `ANTHROPIC_BASE_URL` to route requests through a proxy:

```powershell
$env:ANTHROPIC_BASE_URL = "https://your-proxy.com/v1"
```

Or in agent config:

```json
{ "agent": { "build": { "baseUrl": "https://your-proxy.com/v1" } } }
```

## Environment variable overrides

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Manual API key (bypasses Keychain) | — |
| `ANTHROPIC_BASE_URL` | Custom API base URL (proxy) | `https://api.anthropic.com/v1` |
| `ANTHROPIC_CLI_VERSION` | Claude CLI version for headers | `2.1.80` |
| `ANTHROPIC_USER_AGENT` | Full User-Agent string | `claude-cli/{version}` |
| `ANTHROPIC_BETA_FLAGS` | Comma-separated beta flags | (see source) |
| `ANTHROPIC_ENABLE_1M_CONTEXT` | Enable 1M context window | `false` |
| `CLAUDE_AUTH_DEBUG` | Diagnostic logging | disabled |
| `OPENCODE_CLAUDE_AUTH_MAX_RETRY_MS` | Max retry delay for 429/529 | `30000` |

## macOS Keychain — raw API key fallback

On macOS, the `claude` CLI stores Anthropic console API keys (`sk-ant-api03-...`) in a Keychain service named `Claude Code` (no `-credentials` suffix). The original plugin only reads `Claude Code-credentials*` entries. This fork also reads the bare `Claude Code` service, converts the raw key to `type:"api"` in `auth.json`, and sends it via `x-api-key` header (Anthropic rejects raw keys sent as Bearer tokens).

## Installation

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-claude-auth@git+https://github.com/inoribea/opencode-claude-auth-custom.git"
  ]
}
```

OpenCode automatically clones and installs the plugin on first run — no manual setup needed.

For offline / portable use, copy the `opencode-claude-auth-custom/` folder to `~/.config/opencode/plugins/opencode-claude-auth/` and reference it as `"./plugins/opencode-claude-auth"`.

## Supported models

15 supported models. Run `pnpm run test:models` to verify.

| Model |
|---|
| claude-haiku-4-5 / claude-haiku-4-5-20251001 |
| claude-opus-4-0 / 4-1 / 4-5 / 4-6 / 4-7 |
| claude-sonnet-4-0 / 4-5 / 4-6 |

## Troubleshooting

| Problem | Solution |
|---|---|
| "Credentials not found" | Set `ANTHROPIC_API_KEY` or run `opencode auth login` → Manual API Key |
| `401 Invalid bearer token` | Key stored as `type:"api"` not `type:"oauth"` — clear `auth.json` and re-auth |
| "undefined/chat/completions" | Check `ANTHROPIC_BASE_URL` or agent `baseUrl` is set |
| Not working on Linux/Windows | Ensure `~/.claude/.credentials.json` exists, or use manual API key |
| Keychain access denied | Grant access when macOS prompts you |

## Diagnostic logging

```bash
export CLAUDE_AUTH_DEBUG=1
```

Logs write to `~/.local/share/opencode/claude-auth-debug.log`. Secrets are redacted.

## How it works (technical)

- Registers `auth.loader` for Anthropic provider with custom fetch handler
- OAuth tokens: cached 30s TTL, auto-refreshed via Anthropic's OAuth endpoint
- API keys: written to `auth.json` as `type:"api"`, sent via `x-api-key` header
- Translates tool names between OpenCode and Anthropic API formats
- Buffers SSE response streams at event boundaries
- Injects Claude Code identity into system prompts
- On Windows, writes to both `%USERPROFILE%\.local\share\opencode\auth.json` and `%LOCALAPPDATA%\opencode\auth.json`

## License

MIT

## Credits

Original plugin by [@griffinmartin](https://github.com/griffinmartin/opencode-claude-auth).
macOS Keychain raw key fallback adapted from [@hypeitnow](https://github.com/hypeitnow/opencode-claude-auth) ([issue #235](https://github.com/griffinmartin/opencode-claude-auth/issues/235)).
