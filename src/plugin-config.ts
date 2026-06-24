import { log } from "./logger.ts"

/**
 * Plugin settings that can be set via opencode.json as an alternative
 * to environment variables.
 *
 * Priority: environment variable > opencode.json config > hardcoded default
 *
 * In opencode.json (project-level or ~/.config/opencode/opencode.json):
 *
 * ```json
 * {
 *   "agent": {
 *     "build": {
 *       "enable1mContext": true
 *     }
 *   }
 * }
 * ```
 */
export interface PluginSettings {
  enable1mContext?: boolean
  apiKey?: string
  baseUrl?: string
}

let settings: PluginSettings = {}

/**
 * Extract plugin settings from the opencode Config object.
 *
 * Scans all agent configs for our plugin-specific keys. AgentConfig has
 * a catch-all `[key: string]: unknown` index signature, so arbitrary
 * keys placed in agent configs are preserved through OpenCode's
 * config parser and passed to the plugin via the `config` hook.
 *
 * NOTE: OpenCode's Zod schema may relocate unknown top-level agent keys
 * into `agent.options`. We check both locations defensively so this
 * survives future config parser changes.
 *
 * The first boolean value found (in any agent) wins — even if `false`.
 */
export function applyOpencodeConfig(config: unknown): void {
  if (!config || typeof config !== "object") return

  const cfg = config as Record<string, unknown>
  const agents = cfg.agent as Record<string, unknown> | undefined

  if (!agents || typeof agents !== "object") return

  let found1m = false
  let foundApiKey = false
  let foundBaseUrl = false

  for (const agentConfig of Object.values(agents)) {
    if (!agentConfig || typeof agentConfig !== "object") continue
    const agent = agentConfig as Record<string, unknown>

    // Check top-level first, then fall back to options (where OpenCode's
    // Zod transform may relocate unknown keys)
    if (!found1m) {
      const val =
        agent.enable1mContext ??
        (agent.options as Record<string, unknown> | undefined)?.enable1mContext

      if (typeof val === "boolean") {
        settings.enable1mContext = val
        found1m = true
        log("config_loaded", { enable1mContext: val })
      } else if (val !== undefined) {
        log("config_invalid_type", {
          key: "enable1mContext",
          expectedType: "boolean",
          actualType: typeof val,
        })
      }
    }

    if (!foundApiKey) {
      const apiKey =
        agent.apiKey ??
        (agent.options as Record<string, unknown> | undefined)?.apiKey

      if (typeof apiKey === "string" && apiKey.length > 0) {
        settings.apiKey = apiKey
        foundApiKey = true
        log("config_loaded", { apiKey: apiKey.slice(0, 8) + "...redacted" })
      } else if (apiKey !== undefined) {
        log("config_invalid_type", {
          key: "apiKey",
          expectedType: "string",
          actualType: typeof apiKey,
        })
      }
    }

    if (!foundBaseUrl) {
      const baseUrl =
        agent.baseUrl ??
        (agent.options as Record<string, unknown> | undefined)?.baseUrl

      if (typeof baseUrl === "string" && baseUrl.length > 0) {
        settings.baseUrl = baseUrl
        foundBaseUrl = true
        log("config_loaded", { baseUrl })
      }
    }

    if (found1m && foundApiKey && foundBaseUrl) break
  }

  if (!found1m && !foundApiKey && !foundBaseUrl) {
    log("config_no_plugin_keys", {
      agentCount: Object.keys(agents).length,
    })
  }
}

/**
 * Whether 1M context should be enabled.
 *
 * Priority: ANTHROPIC_ENABLE_1M_CONTEXT env var > opencode.json > false
 */
export function isEnable1mContext(): boolean {
  const envVal = process.env.ANTHROPIC_ENABLE_1M_CONTEXT
  if (envVal !== undefined) return envVal === "true"
  return settings.enable1mContext === true
}

/**
 * Manual Anthropic API key override.
 *
 * Priority: ANTHROPIC_API_KEY env var > opencode.json agent.apiKey > undefined
 *
 * When set, the plugin skips Keychain/credentials file and uses this API key
 * directly. The system prompt transform still applies (Claude Code identity
 * injection in non-OAuth mode continues to work).
 *
 * Set via env var:
 *   export ANTHROPIC_API_KEY=sk-ant-api03-...
 *
 * Set via opencode.json:
 *   {"agent": {"build": {"apiKey": "sk-ant-api03-..."}}}
 */
export function getApiKey(): string | undefined {
  const envVal = process.env.ANTHROPIC_API_KEY
  if (envVal && envVal.length > 0) return envVal
  return settings.apiKey
}

/**
 * Custom Anthropic API base URL override (e.g. for proxies).
 *
 * Priority: ANTHROPIC_BASE_URL env var > opencode.json agent.baseUrl > default
 *
 * Set via env var:
 *   export ANTHROPIC_BASE_URL=https://your-proxy.com/v1
 *
 * Set via opencode.json:
 *   {"agent": {"build": {"baseUrl": "https://your-proxy.com/v1"}}}
 */
export function getBaseUrl(): string | undefined {
  const envVal = process.env.ANTHROPIC_BASE_URL
  if (envVal && envVal.length > 0) return envVal
  return settings.baseUrl
}

export function resetPluginSettings(): void {
  settings = {}
}

export function getPluginSettings(): Readonly<PluginSettings> {
  return { ...settings }
}
