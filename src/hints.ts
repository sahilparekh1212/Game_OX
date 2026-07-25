/**
 * Client for the hints-api Cloudflare Worker.
 *
 * The Worker holds the Anthropic API key server-side; the browser only ever
 * talks to the Worker. Deploy the Worker (see the hints-api repo), then paste
 * its URL below as HINTS_API.
 */

import type { Cell, Player, HintReason } from "./game.ts";

// ▼▼▼  SET THIS to your deployed Worker URL (from `wrangler deploy` output).  ▼▼▼
//      e.g. "https://hints-api.your-subdomain.workers.dev"
// For local testing you can override without editing this file:
//      localStorage.setItem("hintsApi", "http://localhost:8787")
const DEFAULT_HINTS_API = "https://hints-api.sahilparekh1212.workers.dev";

export function hintsApiUrl(): string {
  return localStorage.getItem("hintsApi") || DEFAULT_HINTS_API;
}

export interface OxHintRequest {
  board: Cell[];
  toMove: Player;
  recommended: number;
  reason: HintReason;
}

/** Ask the Worker to explain a pre-computed move. Throws on any failure. */
export async function fetchOxHint(payload: OxHintRequest): Promise<string> {
  const res = await fetch(`${hintsApiUrl()}/hint/ox`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { hint?: string; error?: string };
  if (!res.ok || !data.hint) throw new Error(data.error || `Hint failed (${res.status})`);
  return data.hint;
}
