# Voicebox provider.
#
# Default target:
#   VOICEBOX_MCP_URL=http://192.168.31.200:17493/mcp
#
# This adapter speaks a conservative JSON-RPC MCP tools/call shape. If your
# Voicebox server exposes a different endpoint/tool/argument schema, override
# the env vars below instead of editing the runner.

VOICEBOX_MCP_URL="${VOICEBOX_MCP_URL:-http://192.168.31.200:17493/mcp}"
VOICEBOX_MCP_TOOL="${VOICEBOX_MCP_TOOL:-voicebox.speak}"
VOICEBOX_LIST_PROFILES_TOOL="${VOICEBOX_LIST_PROFILES_TOOL:-voicebox.list_profiles}"
VOICEBOX_TEXT_FIELD="${VOICEBOX_TEXT_FIELD:-text}"
VOICEBOX_VOICE_FIELD="${VOICEBOX_VOICE_FIELD:-profile}"
VOICEBOX_FORMAT_FIELD="${VOICEBOX_FORMAT_FIELD:-}"
VOICEBOX_DEFAULT_VOICE="${VOICEBOX_DEFAULT_VOICE:-}"
VOICEBOX_SESSION_ID="${VOICEBOX_SESSION_ID:-}"
VOICEBOX_HTTP_BASE="${VOICEBOX_HTTP_BASE:-${VOICEBOX_MCP_URL%/mcp}}"
VOICEBOX_STATUS_PATH="${VOICEBOX_STATUS_PATH:-/generate/{id}/status}"
VOICEBOX_AUDIO_PATH="${VOICEBOX_AUDIO_PATH:-/audio/{id}}"
VOICEBOX_LANGUAGE="${VOICEBOX_LANGUAGE:-zh}"
VOICEBOX_POLL_TIMEOUT="${VOICEBOX_POLL_TIMEOUT:-300}"
VOICEBOX_USE_REST="${VOICEBOX_USE_REST:-0}"

# Only a non-secret allowlist is passed to the offline request descriptor.
# The server model/profile revision is not exposed here: no persistent hit is
# claimed for that unresolved identity. Never initialize MCP or list profiles
# from this function just to check the cache.
tts_cache_descriptor() {
  VOICEBOX_MCP_URL="$VOICEBOX_MCP_URL" VOICEBOX_HTTP_BASE="$VOICEBOX_HTTP_BASE" \
  VOICEBOX_USE_REST="$VOICEBOX_USE_REST" VOICEBOX_MCP_TOOL="$VOICEBOX_MCP_TOOL" \
  VOICEBOX_TEXT_FIELD="$VOICEBOX_TEXT_FIELD" VOICEBOX_VOICE_FIELD="$VOICEBOX_VOICE_FIELD" \
  VOICEBOX_FORMAT_FIELD="$VOICEBOX_FORMAT_FIELD" VOICEBOX_DEFAULT_VOICE="$VOICEBOX_DEFAULT_VOICE" \
  VOICEBOX_LANGUAGE="$VOICEBOX_LANGUAGE" VOICEBOX_STATUS_PATH="$VOICEBOX_STATUS_PATH" \
  VOICEBOX_AUDIO_PATH="$VOICEBOX_AUDIO_PATH" VOICEBOX_RESOLVED_PROFILE_ID="${VOICEBOX_RESOLVED_PROFILE_ID:-}" \
    node "$TTS_CACHE_HELPER" describe voicebox "${1:-}"
}

voicebox_json_from_response() {
  local raw="$1"
  local data
  data=$(printf "%s" "$raw" | sed -n 's/^data: //p' | tail -n 1)
  if [[ -n "$data" ]]; then
    printf "%s" "$data"
  else
    printf "%s" "$raw"
  fi
}

voicebox_mcp_initialize() {
  command -v curl >/dev/null || { echo "x curl not found" >&2; return 1; }
  command -v node >/dev/null || { echo "x node not found" >&2; return 1; }

  local result code
  result=$(VOICEBOX_MCP_URL="$VOICEBOX_MCP_URL" node -e '
(async () => {
  const response = await fetch(process.env.VOICEBOX_MCP_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "web-video-presentation", version: "1.0" },
      },
    }),
  });
  if (!response.ok) process.exit(1);
  process.stdout.write(response.headers.get("mcp-session-id") || "");
})().catch(() => process.exit(1));
')
  code=$?
  if [[ $code -ne 0 ]]; then
    return 1
  fi
  VOICEBOX_SESSION_ID="$result"
}

voicebox_rest_check() {
  command -v curl >/dev/null || { echo "x curl not found" >&2; return 1; }
  command -v node >/dev/null || { echo "x node not found" >&2; return 1; }
  curl -fsS --max-time 10 "$VOICEBOX_HTTP_BASE/profiles" >/dev/null
}

voicebox_rest_profiles_json() {
  curl -fsS --max-time 30 "$VOICEBOX_HTTP_BASE/profiles"
}

voicebox_rest_list_voices() {
  local profiles
  profiles=$(voicebox_rest_profiles_json) || return 1
  printf "%s" "$profiles" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    let profiles = data.profiles || data.result?.profiles || data.data || data;
    if (!Array.isArray(profiles)) profiles = Object.values(profiles || {});
    if (!profiles.length) {
      console.error("x Voicebox REST returned no profiles");
      process.exit(1);
    }
    for (const profile of profiles) {
      const id = profile.profile_id || profile.id || profile.uuid || "";
      const name = profile.name || profile.display_name || id || String(profile);
      const kind = profile.voice_type || profile.type || "";
      const lang = profile.language || profile.lang || "";
      console.log([name, id, kind, lang].filter(Boolean).join("\t"));
    }
  } catch {
    console.error("x could not parse Voicebox REST profile list");
    process.exit(1);
  }
});
'
}

voicebox_rest_resolve_profile_id() {
  local voice="$1"
  if [[ -z "$voice" ]]; then
    printf ""
    return 0
  fi
  local profiles
  profiles=$(voicebox_rest_profiles_json) || {
    printf "%s" "$voice"
    return 0
  }
  printf "%s" "$profiles" | VOICEBOX_REQUESTED_VOICE="$voice" node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const voice = process.env.VOICEBOX_REQUESTED_VOICE || "";
    const data = JSON.parse(s);
    let profiles = data.profiles || data.result?.profiles || data.data || data;
    if (!Array.isArray(profiles)) profiles = Object.values(profiles || {});
    const match = profiles.find((profile) => {
      const fields = [
        profile.profile_id,
        profile.id,
        profile.uuid,
        profile.name,
        profile.display_name,
      ].filter(Boolean).map(String);
      return fields.includes(voice);
    });
    process.stdout.write(String(match?.profile_id || match?.id || match?.uuid || voice));
  } catch {
    process.stdout.write(process.env.VOICEBOX_REQUESTED_VOICE || "");
  }
});
'
}

voicebox_extract_generation_id() {
  node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    const content = data?.result?.content || [];
    const textItem = content.find((item) => item?.type === "text" && item?.text);
    let textJson = {};
    try { textJson = textItem ? JSON.parse(textItem.text) : {}; } catch {}
    process.stdout.write(String(
      data.generation_id ||
      data.id ||
      data.result?.generation_id ||
      data.result?.id ||
      data.data?.generation_id ||
      data.data?.id ||
      data?.result?.structuredContent?.generation_id ||
      data?.result?.structuredContent?.id ||
      textJson.generation_id ||
      textJson.id ||
      ""
    ));
  } catch {}
});
'
}

voicebox_download_audio() {
  local generation_id="$1"
  local out="$2"
  local audio_url="${VOICEBOX_HTTP_BASE}${VOICEBOX_AUDIO_PATH/\{id\}/$generation_id}"
  local tmp="${out}.voicebox-download"

  curl -fsS --max-time 120 -o "$tmp" "$audio_url" || return 1
  if command -v ffmpeg >/dev/null; then
    ffmpeg -y -i "$tmp" -codec:a libmp3lame -qscale:a 2 "$out" >/dev/null 2>&1
    local code=$?
    rm -f "$tmp"
    return $code
  fi

  mv "$tmp" "$out"
  echo "x ffmpeg not found; wrote Voicebox audio without conversion. Install ffmpeg for reliable MP3 output." >&2
}

voicebox_rest_synthesize() {
  local text="$1"
  local out="$2"
  local voice="${3:-$VOICEBOX_DEFAULT_VOICE}"
  local profile_id payload raw response generation_id status_url deadline status_raw status_json status_state

  profile_id=$(voicebox_rest_resolve_profile_id "$voice")
  VOICEBOX_USE_REST=1
  VOICEBOX_RESOLVED_PROFILE_ID="$profile_id"
  payload=$(VOICEBOX_TEXT="$text" VOICEBOX_PROFILE_ID="$profile_id" VOICEBOX_LANGUAGE="$VOICEBOX_LANGUAGE" node -e '
const payload = {
  text: process.env.VOICEBOX_TEXT || "",
  language: process.env.VOICEBOX_LANGUAGE || "zh",
};
if (process.env.VOICEBOX_PROFILE_ID) payload.profile_id = process.env.VOICEBOX_PROFILE_ID;
process.stdout.write(JSON.stringify(payload));
')

  raw=$(VOICEBOX_HTTP_BASE="$VOICEBOX_HTTP_BASE" VOICEBOX_PAYLOAD="$payload" node -e '
(async () => {
  const response = await fetch(`${process.env.VOICEBOX_HTTP_BASE}/generate`, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: process.env.VOICEBOX_PAYLOAD || "{}",
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`Voicebox REST /generate failed with HTTP ${response.status} (response body redacted)`);
    process.exit(1);
  }
  process.stdout.write(text);
})().catch(() => {
  console.error("Voicebox REST request failed (endpoint details redacted)");
  process.exit(1);
});
') || return 1
  response=$(voicebox_json_from_response "$raw")
  generation_id=$(printf "%s" "$response" | voicebox_extract_generation_id)

  if [[ -z "$generation_id" ]]; then
    echo "x Voicebox REST /generate did not return generation_id" >&2
    return 1
  fi

  status_url="${VOICEBOX_HTTP_BASE}${VOICEBOX_STATUS_PATH/\{id\}/$generation_id}"
  deadline=$(( $(date +%s) + VOICEBOX_POLL_TIMEOUT ))
  while [[ $(date +%s) -lt $deadline ]]; do
    status_raw=$(curl -fsS --max-time 10 "$status_url") || {
      sleep 1
      continue
    }
    status_json=$(voicebox_json_from_response "$status_raw")
    status_state=$(printf "%s" "$status_json" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    process.stdout.write(String(data.status || data.state || data.result?.status || data.result?.state || data.data?.status || data.data?.state || ""));
  } catch {}
});
')
    if [[ "$status_state" == "completed" || "$status_state" == "complete" || "$status_state" == "done" || "$status_state" == "success" ]]; then
      voicebox_download_audio "$generation_id" "$out"
      return $?
    fi
    if [[ "$status_state" == "failed" || "$status_state" == "error" ]]; then
      echo "x Voicebox REST generation failed: $generation_id" >&2
      return 1
    fi
    sleep 1
  done

  echo "> Voicebox REST polling timed out; trying final audio download: $generation_id" >&2
  voicebox_download_audio "$generation_id" "$out"
  return $?
}

tts_check() {
  if voicebox_mcp_initialize; then
    VOICEBOX_USE_REST=0
    return 0
  fi
  if voicebox_rest_check; then
    VOICEBOX_USE_REST=1
    return 0
  fi
  echo "x Voicebox unavailable. Tried the configured MCP and REST endpoints (URLs redacted)." >&2
  return 1
}

tts_list_voices() {
  command -v node >/dev/null || { echo "x node not found" >&2; return 1; }
  command -v curl >/dev/null || { echo "x curl not found" >&2; return 1; }
  if [[ -z "$VOICEBOX_SESSION_ID" && "$VOICEBOX_USE_REST" != "1" ]]; then
    tts_check >/dev/null || return 1
  fi
  if [[ "$VOICEBOX_USE_REST" == "1" ]]; then
    voicebox_rest_list_voices
    return $?
  fi

  local payload raw response
  payload=$(node -e '
const tool = process.argv[1];
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: tool, arguments: {} },
}));
' "$VOICEBOX_LIST_PROFILES_TOOL")

  if [[ -n "$VOICEBOX_SESSION_ID" ]]; then
    raw=$(curl -fsS --max-time 30 -X POST "$VOICEBOX_MCP_URL" \
      -H "Accept: application/json, text/event-stream" \
      -H "Content-Type: application/json" \
      -H "Mcp-Session-Id: $VOICEBOX_SESSION_ID" \
      -d "$payload") || return 1
  else
    raw=$(curl -fsS --max-time 30 -X POST "$VOICEBOX_MCP_URL" \
      -H "Accept: application/json, text/event-stream" \
      -H "Content-Type: application/json" \
      -d "$payload") || return 1
  fi

  response=$(voicebox_json_from_response "$raw")
  if printf "%s" "$response" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    const content = data?.result?.content || [];
    let profiles = data?.result?.structuredContent?.profiles || data?.result?.profiles || [];
    if (!Array.isArray(profiles)) profiles = [];
    if (profiles.length === 0) {
      const textItem = content.find((item) => item?.type === "text" && item?.text);
      if (textItem) {
        try {
          const parsed = JSON.parse(textItem.text);
          profiles = parsed.profiles || parsed;
        } catch {}
      }
    }
    if (!Array.isArray(profiles) || profiles.length === 0) {
      console.error("x Voicebox returned no profiles. Try native MCP voicebox_list_profiles if available.");
      process.exit(1);
    }
    for (const profile of profiles) {
      const name = profile.name || profile.id || String(profile);
      const kind = profile.voice_type || profile.type || "";
      const lang = profile.language || "";
      const personality = profile.has_personality ? "personality" : "";
      console.log([name, kind, lang, personality].filter(Boolean).join("\t"));
    }
  } catch (err) {
    console.error("x could not parse Voicebox profile list");
    process.exit(1);
  }
});
' 2>/dev/null; then
    return 0
  fi

  echo "> Voicebox MCP profile list failed; trying REST /profiles" >&2
  voicebox_rest_list_voices
}

tts_install_help() {
  cat <<EOF >&2
Voicebox is an explicitly selected optional TTS provider (auto remains MMX-only).

Expected LAN host:
  192.168.31.200

Current endpoints are not printed; they may contain private credentials.

If your Voicebox MCP endpoint or tool name differs, set:
  export VOICEBOX_MCP_URL=http://192.168.31.200:<port>/<path>
  export VOICEBOX_MCP_TOOL=<tool_name>

If the MCP tool returns only a generation id or the MCP path is unavailable,
this adapter falls back to the Voicebox REST API with no /api prefix:
  GET  <http-base>/profiles
  POST <http-base>/generate
  GET  <http-base>/generate/{id}/status
  GET  <http-base>/audio/{id}

If the host Agent exposes Voicebox as a native MCP tool instead of HTTP,
use that MCP tool to synthesize every row in audio-segments.json and write
files to public/audio/<chapter>/<step>.mp3, then run npm run build-timing.

List Voicebox profiles before synthesis:
  npm run synthesize-audio -- --provider=voicebox --list-voices

Choose a specific profile by name:
  npm run synthesize-audio -- --provider=voicebox --voice="沉稳高管"
  npm run synthesize-audio -- --provider=voicebox --voice="电台男主播"
EOF
}

tts_synthesize() {
  local text="$1"
  local out="$2"
  local voice="${3:-$VOICEBOX_DEFAULT_VOICE}"
  local payload raw response audio_b64 audio_url

  if [[ "$VOICEBOX_USE_REST" == "1" ]]; then
    voicebox_rest_synthesize "$text" "$out" "$voice"
    return $?
  fi

  payload=$(node -e '
const [tool, textField, voiceField, formatField, text, voice] = process.argv.slice(1);
const payload = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: tool,
    arguments: {
      [textField]: text,
    },
  },
};
if (formatField) payload.params.arguments[formatField] = "mp3";
if (voice) payload.params.arguments[voiceField] = voice;
process.stdout.write(JSON.stringify(payload));
' "$VOICEBOX_MCP_TOOL" "$VOICEBOX_TEXT_FIELD" "$VOICEBOX_VOICE_FIELD" "$VOICEBOX_FORMAT_FIELD" "$text" "$voice")

  if [[ -z "$VOICEBOX_SESSION_ID" ]]; then
    tts_check >/dev/null || return 1
    if [[ "$VOICEBOX_USE_REST" == "1" ]]; then
      voicebox_rest_synthesize "$text" "$out" "$voice"
      return $?
    fi
  fi

  if [[ -n "$VOICEBOX_SESSION_ID" ]]; then
    raw=$(curl -fsS --max-time 120 -X POST "$VOICEBOX_MCP_URL" \
      -H "Accept: application/json, text/event-stream" \
      -H "Content-Type: application/json" \
      -H "Mcp-Session-Id: $VOICEBOX_SESSION_ID" \
      -d "$payload") || return 1
  else
    raw=$(curl -fsS --max-time 120 -X POST "$VOICEBOX_MCP_URL" \
      -H "Accept: application/json, text/event-stream" \
      -H "Content-Type: application/json" \
      -d "$payload") || return 1
  fi

  response=$(voicebox_json_from_response "$raw")

  audio_b64=$(printf "%s" "$response" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    const content = data?.result?.content || [];
    const audio = content.find((item) => item?.type === "audio" || item?.mimeType === "audio/mpeg");
    process.stdout.write(data?.result?.structuredContent?.audioBase64 || data?.result?.audioBase64 || audio?.data || "");
  } catch {}
});
')

  if [[ -n "$audio_b64" ]]; then
    AUDIO_B64="$audio_b64" node -e '
const fs = require("fs");
fs.writeFileSync(process.argv[1], Buffer.from(process.env.AUDIO_B64 || "", "base64"));
' "$out"
    return $?
  fi

  audio_url=$(printf "%s" "$response" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    const content = data?.result?.content || [];
    const resource = content.find((item) => item?.type === "resource" && item?.uri);
    process.stdout.write(data?.result?.structuredContent?.audioUrl || data?.result?.audioUrl || resource?.uri || "");
  } catch {}
});
')

  if [[ -n "$audio_url" ]]; then
    curl -fsS --max-time 120 -o "$out" "$audio_url"
    return $?
  fi

  local generation_id status_url deadline status_raw status_json status_b64 status_audio_url status_state
  generation_id=$(printf "%s" "$response" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    const content = data?.result?.content || [];
    const textItem = content.find((item) => item?.type === "text" && item?.text);
    let textJson = {};
    try { textJson = textItem ? JSON.parse(textItem.text) : {}; } catch {}
    process.stdout.write(
      data?.result?.structuredContent?.generation_id ||
      data?.result?.structuredContent?.id ||
      data?.result?.generation_id ||
      data?.result?.id ||
      textJson.generation_id ||
      textJson.id ||
      ""
    );
  } catch {}
});
')

  if [[ -n "$generation_id" ]]; then
    status_url="${VOICEBOX_HTTP_BASE}${VOICEBOX_STATUS_PATH/\{id\}/$generation_id}"
    deadline=$(( $(date +%s) + VOICEBOX_POLL_TIMEOUT ))
    while [[ $(date +%s) -lt $deadline ]]; do
      status_raw=$(curl -fsS --max-time 10 "$status_url") || {
        sleep 1
        continue
      }
      status_json=$(voicebox_json_from_response "$status_raw")
      status_state=$(printf "%s" "$status_json" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    process.stdout.write(String(data.status || data.state || data.result?.status || data.result?.state || ""));
  } catch {}
});
')
      status_b64=$(printf "%s" "$status_json" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    process.stdout.write(data.audioBase64 || data.audio_base64 || data.result?.audioBase64 || data.result?.audio_base64 || "");
  } catch {}
});
')
      if [[ -n "$status_b64" ]]; then
        AUDIO_B64="$status_b64" node -e 'const fs = require("fs"); fs.writeFileSync(process.argv[1], Buffer.from(process.env.AUDIO_B64 || "", "base64"));' "$out"
        return $?
      fi
      status_audio_url=$(printf "%s" "$status_json" | node -e '
let s = "";
process.stdin.on("data", (d) => s += d);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(s);
    process.stdout.write(data.audioUrl || data.audio_url || data.url || data.result?.audioUrl || data.result?.audio_url || data.result?.url || "");
  } catch {}
});
')
      if [[ -n "$status_audio_url" ]]; then
        curl -fsS --max-time 120 -o "$out" "$status_audio_url"
        return $?
      fi
      if [[ "$status_state" == "failed" || "$status_state" == "error" ]]; then
        echo "x Voicebox generation failed: $generation_id" >&2
        return 1
      fi
      sleep 1
    done
    echo "x Voicebox generation timed out: $generation_id" >&2
    return 1
  fi

  echo "> Voicebox MCP response did not contain audioBase64/audioUrl/generation_id; trying REST fallback" >&2
  voicebox_rest_synthesize "$text" "$out" "$voice" && return 0
  echo "x Voicebox response did not contain audioBase64 or audioUrl" >&2
  return 1
}
