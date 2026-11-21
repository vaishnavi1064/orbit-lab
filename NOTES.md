# Orbit Lab: build notes

A running log of decisions, bugs, and fixes. Newest phase at the bottom.

## Setup (step 0)

- CLI: `deepspace` v0.44.2 (SDK pinned exactly to 0.44.2 by the scaffolder).
- Node 24.11.1, npm 11.6.2 (docs require npm 11.6+).
- Scaffolded in place with `npm create deepspace@latest . -- --with-skill`
  (starter template). The scaffolder named the app after the folder
  (`space`); renamed to `orbit-lab` in `wrangler.toml`, `package.json`,
  `src/constants.ts`, and `index.html` BEFORE first registration, so the
  app id is minted under the right name.
- `.gitignore` extended with `.env`, `.env.*`, `*.pem`, `*.key`,
  `.claude/settings.local.json` (scaffold already ignores `node_modules`,
  `dist`, `.wrangler`, `.dev.vars*`, `.deepspace`).
- Source authority: GitHub (`vaishnavi1064/orbit-lab`). Per
  `/guides/source-control`, an unclaimed app's first deploy from a checkout
  whose remote points at GitHub permanently claims that repo. `deepspace push`
  is never run (it would claim DeepSpace source instead).

### Docs vs. prompt discrepancies found

- The prompt says `npx deepspace integrations info <name>/`. That form is
  refused with `bad_target`; `info` needs `<integration>/<endpoint>`. I used
  `integrations list --json` to get endpoint names, then `info` per endpoint.
- `/guides/external-apis` says `'developer'`-billed integrations accept
  anonymous callers. The installed 0.44.2 scaffold (`src/integrations.ts`)
  says the opposite: "Every integration requires a signed-in caller", with an
  explicit `anonymous: true` opt-in. The installed SDK wins (docs lag build).
  We keep the default: no `anonymous` flag anywhere. This matches SPEC.

## Integration contracts (from `integrations info`, never guessed)

All calls go through `tools.integration(endpoint, body)` inside server
actions. Billing: `'developer'` (owner pays; the default for unlisted
integrations), signed-in caller required.

### anthropic/chat-completion

- Input: `{ model?: string = "claude-opus-5-5", max_tokens?: number = 4096,
  messages: [{ role: "user"|"assistant", content: string | block[] }],
  system?: string, temperature?: 0..1 }`
- Output: no curated output schema in the catalog, so I made ONE test call
  (`claude-haiku-5-5`, 60 tokens, $0.0000136). Real envelope:
  `{ success: true, data: { model, id, type: "message", role: "assistant",
  content: [{ type: "text", text: "..." }], stop_reason, usage, costUsd } }`
  i.e. the native Anthropic Messages shape. We read `data.content[*].text`.

### exa/search

- Input: `{ query: string, numResults?: 1..100 = 10, type?: "auto",
  category?, includeDomains?: string[], excludeDomains?: string[],
  startPublishedDate?, endPublishedDate?, includeText?, excludeText?,
  contents?: { text?: boolean | { maxCharacters }, highlights?: {
  maxCharacters, query, numSentences, highlightsPerUrl }, summary?: { query } } }`
- Output: `{ results: [{ title, url, publishedDate|null, author|null, id,
  text?, highlights?, summary? }], costDollars?, costUsd? }`
- Other exa endpoints exist (`answer`, `contents`, `findSimilar`,
  `news-search`); not needed.

### fal/run-model (async) + fal/get-result (poll)

- `run-model` input: `{ model_id: string, input: object = {},
  maxCostUsd?: 0.001..50 = 2 }` -> output `{ jobId: string, status: string }`
- `get-result` input: `{ request_id: string }` -> output `{ status,
  queuePosition?, output?, costUsd?, error? }`
- `get-model` (free) for `fal-ai/flux/schnell`: runnable, $0.003 per
  megapixel. Input props: `prompt, image_size, num_inference_steps, seed,
  num_images, output_format, enable_safety_checker, sync_mode, acceleration,
  guidance_scale`. Output props: `images, seed, prompt, has_nsfw_concepts,
  timings` (images are `{ url, width, height, content_type }`).
- `list-models` exists for discovery; not needed.

### elevenlabs/generate-speech (stretch, NOT planned)

- Input: `{ text: 1..5000 chars, voice_id? = "JBFqnCBsd6RMkjVDRZzb",
  model_id? = "eleven_flash_v2_5", output_format? = "mp3_44100_128",
  voice_settings? }` -> audio as a data URL. Billed per character.
- Out of scope per SPEC (stretch). Recorded so the shape is not guessed later.

## Architecture (decided before coding)

```
Browser (React, Vite, Tailwind v4)
  |  WebSocket: useQuery/useMutations  (RBAC-filtered by the DO)
  |  HTTPS: POST /api/actions/:name     (Bearer JWT, verified in worker)
  v
Cloudflare Worker (Hono, worker.ts)
  |-- src/actions/*      generateScenario, submitAnswer, upvote, getDebrief
  |-- src/server/ai.ts   the ONLY module that talks to integrations
  |                      (AI_MODE=mock -> canned data; live -> DeepSpace proxy)
  v
AppRecordRoom (Durable Object, SQLite)  <- the only database
  collections: users, settings (scaffold), scenarios, answerKeys,
               answers, upvotes
```

No external DB, ORM, or separate backend. No Anthropic/OpenAI SDKs; no API
keys anywhere (the platform proxy holds them).

### Collections and RBAC

| Collection   | Read                                   | Client writes | Why |
| ------------ | -------------------------------------- | ------------- | --- |
| `scenarios`  | everyone (public per SPEC)             | none          | Only `generateScenario` creates them. |
| `answerKeys` | NOBODY (every role, incl. admin/owner) | none          | Never synced to any socket. Read only by server actions. |
| `answers`    | `'shared'`: owner OR listed in `crew`  | none          | See "answer visibility" below. |
| `upvotes`    | `'own'`                                | none          | Users see which answers they upvoted; counts live on the answer. |

Every write goes through a server action, so all validation (length,
one-per-user, no self-upvote, scenario exists) is in one place, and
`uniqueOn` backs it up in the DO.

### Answer visibility (the core security property)

SPEC: before a user submits for a scenario they may read no answers for it;
after they submit they may read all of them, live.

DeepSpace RBAC has no "read if caller has a row in another collection" rule,
so the rule is encoded per row:

- Each `answers` row has `crew: string[]` (JSON) declared as the schema's
  `collaboratorsField`, and `ownerField: 'userId'`.
- `read: 'shared'` means owner OR in `crew`. No `visibilityField`, so there is
  no public path.
- `submitAnswer` (server action, RBAC bypassed) creates the caller's answer
  with `crew = all current submitters`, then re-queries and patches every
  answer for that scenario so `crew` = the full submitter set. The re-query
  after create makes two simultaneous submits converge (DO serializes writes).
- I checked the installed SDK (`dist/worker.js`, `broadcastChange`): every
  change is re-checked with `canRead` per socket, and an update that makes a
  row newly readable is broadcast to that socket (the client store treats it
  as an add). So when B submits, A instantly receives B's answer, and B
  receives all earlier answers. Live Crew Log with no polling.
- Cost: O(n) row updates per submit for n answers on a scenario. Fine for
  this app's scale; noted as a known limit.

### Answer key visibility

- `answerKeys` has `read: false` for every role, so it never ships on the
  WebSocket.
- `submitAnswer` returns `{ feedback, correctAnswer, rubric, sources }` in its
  response, only after saving the answer.
- `getDebrief(scenarioId)` returns the key only if the caller already has an
  answer row for that scenario (used when revisiting a finished scenario).

### Scenario cache / reuse

`generateScenario(track)`:
1. Query scenarios in the track and the caller's answers.
2. If any scenario in the track is unanswered by the caller, return it
   (no AI call). New scenarios are only generated when the caller has
   finished every existing one. Each scenario is generated once and reused
   for all users.
3. Per-user cap on generations per day (spend control, docs recommend an app
   layer limit) plus button disabled while in flight.

### Mock mode

`AI_MODE` is a plain `[vars]` entry in `wrangler.toml` (not a secret).
`src/server/ai.ts` exposes `generateScenarioContent`, `findSources`,
`gradeAnswer`, `generateImage`. Mock returns canned, realistic data (2+
scenarios per track, rubric-based grading heuristic). Live calls the
integrations above. Model output is validated with zod; one retry; then a
friendly error.

### Frontend

- Static landing at `/` (`src/pages/index.tsx`, prerendered, no providers).
- Data pages under `src/pages/(app)/(protected)/`: `/tracks`,
  `/track/:id`, `/scenario/:id`, `/me` (sign-in required; the action routes
  also reject unauthenticated calls server-side).
- UI kit: the scaffold's Base UI primitives in `src/components/ui`
  (the docs say to use these, not a second kit, so shadcn/ui is not added),
  Tailwind v4 tokens, lucide-react, framer-motion for motion.
- `npx deepspace add --list` checked: no feature fits the core loop
  (`tasks` is a claim/grade workflow, `landing` is a skeleton the design docs
  say to rewrite). Nothing added from it.

## Phase 1: shell, auth, tracks, starfield (deployed)

Live: https://orbit-lab.app.space (release `rel_01M7YMB51JK7ZCADDYDE8J77ZR`,
source claimed: `github · vaishnavi1064/orbit-lab`, clean worktree).

Built
- `orbit` theme (src/themes.css), the only theme; `slate`/`paper` placeholders
  removed. Fonts: Space Grotesk / Inter / IBM Plex Mono via Google Fonts.
- `Starfield` canvas: 3 depth layers, drift, pointer+scroll parallax, pauses
  on hidden tab, single static draw under reduced motion. Colors read from
  CSS tokens.
- Static landing (`src/pages/index.tsx`, prerendered) with the Design
  Direction block, orbit hero (SVG, SMIL motion added only after mount and
  only without reduced motion so prerender HTML matches hydration), asymmetric
  track bento, flight-plan section with a React mock of the debrief panel.
- App shell: rebuilt Navigation (kept scaffold test ids), starfield behind the
  app, `MotionConfig reducedMotion="user"`, `/home` hub (data-forward), track
  page shell at `/track/:id` under `(protected)`.
- Design gates from `/design/anti-ai-gate` and `/design/product-polish`: all
  clean. Only advisory hits are the starfield's rAF calls, which are gated by
  `useReducedMotion()`.

Bugs hit and fixes
- Headline wrapped to 4 lines at 1440px. Fix: wider text column and one
  `block lg:whitespace-nowrap` span per sentence, so it is two lines on desktop.
- Hero radial glow showed a hard rectangular edge (the gradient extended past
  its box). Removed it; the SVG atmosphere halo already carries the glow.
- Debrief mock header ran together on mobile (`DEBRIEFMISSION 04`). Fix:
  `flex-wrap` with a gap.
- Track cards were too tall on phones. Min-heights are now desktop-only.
- `node` could not resolve `@playwright/test` from a script in the scratchpad;
  moved the screenshot helper into `tests/tools/shot.mjs`.

Unsure / notes
- Console shows a Chromium warning, `Unrecognized feature: 'document-domain'`,
  from the scaffold's `public/_headers` Permissions-Policy. It is a warning,
  not an error, and harmless; I left the scaffold's security headers as they are.
- `deepspace test screenshot` only captures signed-out views. Signed-in
  screenshots will use the Playwright test fixture in later phases.
- The CLI's `deploy` only claims GitHub when a GitHub remote is selected;
  confirmed beforehand with `deepspace status` (`sourceInference: github`).
