#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEGMENTS="$ROOT/audio-segments.json"
OUT_DIR="$ROOT/public/audio"
PROVIDERS_DIR="$SCRIPT_DIR/tts-providers"
EVENTS="$ROOT/feedback-events.jsonl"
MANIFEST="$ROOT/output/tts-manifest.json"

PROVIDER="${PRESENTATION_TTS:-auto}"
VOICE="${PRESENTATION_TTS_VOICE:-}"
ALLOW_DEFAULT_VOICE="${PRESENTATION_TTS_ALLOW_DEFAULT_VOICE:-false}"
FORCE=false
LIST_VOICES=false

record_event() {
  local status="$1"
  local note="$2"
  node - "$EVENTS" "$ROOT/project-state.json" "$PROVIDER" "$VOICE" "$status" "$note" <<'NODE'
const fs = require("fs");
const [eventsPath, statePath, provider, voice, status, note] = process.argv.slice(2);
let version = "generated-project";
try {
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
    if (state.projectVersion) version = String(state.projectVersion);
  }
} catch {}
const event = {
  schema: 1,
  time: new Date().toISOString(),
  projectSkill: "web-video-presentation",
  projectVersion: version,
  phase: "tts",
  eventType: "tts-choice",
  severity: status === "pass" ? "normal" : "high",
  userQuote: "",
  chapter: null,
  step: null,
  shot: null,
  target: "tts-provider-voice",
  problem: status === "pass" ? "" : note,
  agentAction: `provider=${provider}; voice=${voice || "provider-default"}`,
  filesChanged: [],
  validation: [{ command: "npm run synthesize-audio", status, evidence: note }],
  userResolution: "pending",
  workflowCandidate: { shouldUpdateWorkflow: false, suggestedFile: "", rule: "" },
  notes: "No secrets are recorded. Provider and voice/profile only.",
};
fs.appendFileSync(eventsPath, JSON.stringify(event) + "\n", "utf8");
NODE
}

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --list-voices) LIST_VOICES=true ;;
    --allow-provider-default) ALLOW_DEFAULT_VOICE=true ;;
    --voice=*) VOICE="${arg#--voice=}" ;;
    --provider=*) PROVIDER="${arg#--provider=}" ;;
    -h|--help)
      sed -n '1,80p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *) echo "x unknown arg: $arg" >&2; exit 1 ;;
  esac
done

command -v node >/dev/null || { echo "x node is required" >&2; exit 1; }
# Read-only, offline route guard, before sourcing/checking/listing any provider.
# Missing source retains legacy runner compatibility only with audioRequested=true; explicit none/provided never
# becomes permission to synthesize, even with --force. Do not change project state.
node - "$ROOT/project-state.json" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
if (!fs.existsSync(path)) { console.error('x Missing project-state.json; no audio authorization, no provider was loaded.'); process.exit(1); }
let state;
try { state = JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
catch { console.error('x Cannot read project audio source; repair project-state.json before TTS.'); process.exit(1); }
if (!state || typeof state !== 'object' || Array.isArray(state)) {
  console.error('x Invalid project state; no provider was loaded.'); process.exit(1);
}
if (state.audioSource === undefined) {
  // Legacy silent projects predate audioSource. A missing field cannot erase an
  // explicit refusal, and malformed flags cannot authorize provider activity.
  if (state.audioRequested !== true) {
    console.error('x Legacy audioRequested is missing, false or invalid; refusing TTS, voice listing and --force before provider load.'); process.exit(1);
  }
  process.exit(0);
}
if (!['tts','provided','none'].includes(state.audioSource) || typeof state.audioRequested !== 'boolean' || ((state.audioSource !== 'none') !== state.audioRequested)) {
  console.error('x Invalid explicit audioSource/audioRequested combination; no provider was loaded.'); process.exit(1);
}
if (state.audioSource !== 'tts') {
  console.error(`x audioSource=${state.audioSource}: refusing TTS, voice listing and --force. Use existing authorized recordings/explicit silent timing; select tts only after actual authorization.`);
  process.exit(1);
}
NODE

if [[ ! -f "$SEGMENTS" && "$LIST_VOICES" != true ]]; then
  echo "x $SEGMENTS not found. Run: npm run extract-narrations" >&2
  exit 1
fi
mkdir -p "$ROOT/output"

# Descriptor resolution is offline. It must not check auth, list voices, or make
# network calls; provider health checks are deferred until synthesis is needed.
TTS_CACHE_HELPER="$SCRIPT_DIR/tts-cache.mjs"
CACHE_WORK="$(mktemp -d "$ROOT/output/.tts-cache.XXXXXX")"
STAGED_DIR=""
trap 'rm -rf "$CACHE_WORK"; if [[ -n "$STAGED_DIR" ]]; then rm -rf "$STAGED_DIR"; fi' EXIT
DESCRIPTOR="$CACHE_WORK/request.json"
PLAN="$CACHE_WORK/plan.json"

describe_request() {
  if declare -F tts_cache_descriptor >/dev/null; then
    tts_cache_descriptor "$VOICE" > "$DESCRIPTOR"
  else
    node "$TTS_CACHE_HELPER" describe "$PROVIDER" "$VOICE" > "$DESCRIPTOR"
  fi
}

record_manifest_row() {
  node "$TTS_CACHE_HELPER" record "$ROOT" "$PLAN" "$1" "$2" "$3" "$4" "$PROVIDERS_DIR/$PROVIDER.sh" "$DESCRIPTOR" "$VOICE"
}

unset_provider_functions() {
  unset -f tts_synthesize 2>/dev/null || true
  unset -f tts_check 2>/dev/null || true
  unset -f tts_list_voices 2>/dev/null || true
  unset -f tts_install_help 2>/dev/null || true
  unset -f tts_cache_descriptor 2>/dev/null || true
}

load_provider() {
  local name="$1"
  [[ "$name" =~ ^[a-zA-Z0-9_-]+$ ]] || return 1
  local file="$PROVIDERS_DIR/$name.sh"
  [[ -f "$file" ]] || return 1
  unset_provider_functions
  # shellcheck source=/dev/null
  source "$file"
  declare -F tts_synthesize >/dev/null || return 1
}

print_fallbacks() {
  cat <<'EOF' >&2

MMX is unavailable.

Ask the user which fallback backend to use:

  Service                  Use
  Azure Speech             high-quality TTS
  Volcengine Doubao Voice  Chinese TTS fallback
  Alibaba CosyVoice        Chinese TTS fallback
  Edge TTS                 preferred free fallback, no key (pip install edge-tts)
  ElevenLabs               best English quality
  Google Cloud TTS         broadest language support
  OpenAI                   simple API

Optional cover generation providers:
  Google Gemini, Alibaba Bailian

See scripts/tts-providers/README.md and references/TTS-ROUTING.md.
EOF
}

AUTO_REQUESTED=false
if [[ "$PROVIDER" == "auto" ]]; then
  AUTO_REQUESTED=true
  # Keep the MMX-only default route. Loading an adapter is not permission to
  # contact it: existing files are verified/blocked before any health check.
  PROVIDER=minimax
fi
if ! load_provider "$PROVIDER"; then
  echo "x TTS provider '$PROVIDER' not found at $PROVIDERS_DIR/$PROVIDER.sh" >&2
  [[ "$AUTO_REQUESTED" != true ]] || print_fallbacks
  exit 1
fi

check_provider_for_synthesis() {
  if declare -F tts_check >/dev/null && ! tts_check; then
    if [[ "$AUTO_REQUESTED" == true ]]; then print_fallbacks
    elif declare -F tts_install_help >/dev/null; then tts_install_help
    fi
    return 1
  fi
}

if [[ "$LIST_VOICES" == true ]]; then
  if declare -F tts_list_voices >/dev/null; then
    tts_list_voices
  else
    cat >&2 <<EOF
provider '$PROVIDER' does not expose a voice list.
Use the provider docs or pass a known voice/profile:
  npm run synthesize-audio -- --provider=$PROVIDER --voice=<voice-id-or-name>
EOF
  fi
  exit 0
fi

if [[ "$ALLOW_DEFAULT_VOICE" == "1" || "$ALLOW_DEFAULT_VOICE" == "yes" || "$ALLOW_DEFAULT_VOICE" == "true" ]]; then
  ALLOW_DEFAULT_VOICE=true
else
  ALLOW_DEFAULT_VOICE=false
fi

if [[ -z "$VOICE" && "$ALLOW_DEFAULT_VOICE" != true ]]; then
  cat >&2 <<EOF
x no TTS voice/profile selected.

Enterprise workflow requires an explicit provider-internal voice/profile before synthesis.
List available voices first, then pass --voice:

  npm run synthesize-audio -- --provider=$PROVIDER --list-voices
  npm run synthesize-audio -- --provider=$PROVIDER --voice=<voice-id-or-profile>

If the user explicitly approved the provider default voice, run:

  npm run synthesize-audio -- --provider=$PROVIDER --allow-provider-default

EOF
  exit 1
fi

command -v ffprobe >/dev/null || { echo "x ffprobe is required to verify MP3 duration before synthesis or reuse" >&2; exit 1; }
describe_request
# Old/failed/unknown metadata never authorizes an automatic billable retry.
# --force retains its original meaning; get the user's approval before using it.
node "$TTS_CACHE_HELPER" plan "$ROOT" "$PROVIDERS_DIR/$PROVIDER.sh" "$DESCRIPTOR" "$PLAN" "$FORCE" || exit $?
if node "$TTS_CACHE_HELPER" needs-synthesis "$PLAN"; then
  cp "$DESCRIPTOR" "$CACHE_WORK/request-before-check.json"
  check_provider_for_synthesis || exit 1
  # A provider check may resolve its transport (e.g. Voicebox MCP vs REST).
  describe_request
  if ! cmp -s "$DESCRIPTOR" "$CACHE_WORK/request-before-check.json"; then
    node "$TTS_CACHE_HELPER" plan "$ROOT" "$PROVIDERS_DIR/$PROVIDER.sh" "$DESCRIPTOR" "$PLAN" "$FORCE" || exit $?
  fi
fi

total=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).rows.length)' "$PLAN")
synthesized=0
skipped=0
failed=0
i=0

echo "> processing $total segments (provider=$PROVIDER, voice=${VOICE:-provider-default})"
while IFS=$'\t' read -r chapter step encoded_text action; do
  i=$((i + 1))
  # Sentinel keeps trailing newlines intact under shell command substitution.
  text=$(node -e 'process.stdout.write(Buffer.from(process.argv[1].slice(1), "base64").toString("utf8") + "x")' "$encoded_text")
  text="${text%x}"
  out="$OUT_DIR/$chapter/$step.mp3"

  if [[ "$action" == reuse ]]; then
    record_manifest_row "$chapter" "$step" reused "$out"
    printf "[%3d/%d] %-20s skip (verified request/audio evidence)\n" "$i" "$total" "$chapter/$step.mp3"
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$(dirname "$out")"
  # Invalidate success before invoking the provider. Interruptions and failures
  # must never leave an old successful row reusable for the attempted request.
  record_manifest_row "$chapter" "$step" pending "$out"
  # Stage on the destination filesystem so replacement is an atomic rename.
  STAGED_DIR="$(mktemp -d "$(dirname "$out")/.tts-stage.XXXXXX")"
  staged="$STAGED_DIR/audio.mp3"
  start=$(date +%s)
  if tts_synthesize "$text" "$staged" "$VOICE" && node "$TTS_CACHE_HELPER" probe "$staged"; then
    # Some adapters can resolve a profile/transport only during their request.
    describe_request
    mv "$staged" "$out"
    record_manifest_row "$chapter" "$step" synthesized "$out"
    elapsed=$(( $(date +%s) - start ))
    printf "[%3d/%d] %-20s ok %ss\n" "$i" "$total" "$chapter/$step.mp3" "$elapsed"
    synthesized=$((synthesized + 1))
  else
    rm -f "$staged"
    record_manifest_row "$chapter" "$step" failed "$out"
    printf "[%3d/%d] %-20s FAILED (previous audio retained, not reusable as successful cache)\n" "$i" "$total" "$chapter/$step.mp3" >&2
    failed=$((failed + 1))
  fi
  rm -rf "$STAGED_DIR"
  STAGED_DIR=""
done < <(node "$TTS_CACHE_HELPER" rows "$PLAN")

echo
echo "done (provider=$PROVIDER) — synthesized $synthesized, skipped $skipped, failed $failed"
if [[ $failed -eq 0 ]]; then
  record_event "pass" "synthesized=$synthesized skipped=$skipped failed=$failed"
else
  record_event "fail" "synthesized=$synthesized skipped=$skipped failed=$failed"
  exit 2
fi
