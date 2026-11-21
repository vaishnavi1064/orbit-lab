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

## Phase 2: core loop (deployed, AI_MODE=mock)

Live release `rel_01M7YNBD1AV2FT8TSW6XFW75TH`.

Built
- Schemas: `scenarios` (public read, no client writes), `answerKeys`
  (`read:false` for every role incl. admin), `answers` (owner-only read for
  now, `uniqueOn: [scenarioId, userId]`, `ownerField: userId`).
- `src/server/ai.ts`: mock/live switch, one shared path for model output
  (extract JSON, zod validate, one retry with the validation error fed back,
  then a friendly `AiError`). Grader prompt treats the learner answer as
  untrusted data in `<answer>` tags; score is clamped and rounded.
  `AI_MOCK_BAD_JSON=true` forces malformed output to test the error path.
- `src/server/mock-data.ts`: 2 scenarios per track (10), every source URL
  checked for HTTP 200; keyword lists drive a deterministic mock grader.
- Actions: `generateScenario` (reuse oldest unanswered scenario in the track
  first; only generates when the caller has flown them all; 8/day cap per
  user; key written before the public scenario under the same id),
  `submitAnswer` (1..1500 chars after trim, duplicate check + DO `uniqueOn`,
  grade, save, then return key + feedback), `getDebrief` (key only if the
  caller has an answer row).
- UI: incoming-transmission briefing (scanline sweep, teleprinter reveal capped
  at 2.4s, skip button, full text for screen readers), answer console with
  counter and Ctrl+Enter, "Contacting Houston..." grading state, debrief with
  animated score ring and staggered lists, track mission log with stats,
  "Next briefing" flow, home cards show flown/avg per track.
- SPEC says Phase 2 is "anthropic only": scenarios are created with
  `sources: []` and `imageUrl: ''` (exa and fal come in Phases 4 and 5).

Tests
- `tests/core-loop.spec.ts` (local, mock): full loop; answer key DATA and
  `answerKeys` records absent from every WS frame and /api response before
  submit; second submit refused; 1501 chars refused; revisit shows stored
  debrief; signed-out POSTs to all actions and to
  `/api/integrations/anthropic/chat-completion` get 401; zero console errors.
- `src/server/ai.test.ts` (vitest): JSON extraction, mock content, grader,
  bad JSON -> retry -> AiError, live-mode retry accepts the second reply.
- `tests/tools/prod-smoke.mjs`: same loop against https://orbit-lab.app.space
  with a test account. Result: key not on the wire, debrief 8/10, revisit ok,
  no console errors.

Bugs hit and fixes
- **Production-only crash: `useQuery('scenarios'): No scope found`.** Worked in
  dev, failed after deploy. Sourcemaps showed `deepspace/dist/index.js`
  bundled into TWO chunks, so `RecordScope` and `useQuery` used different
  React contexts. Cause: Windows drive-letter case. The shell cwd is
  `d:\space` but some paths were realpath'd to `D:\space`, so the bundler saw
  two module ids for one file. Fix: `vite.config.ts` sets
  `root = realpathSync.native(process.cwd())` and derives the `@` alias from
  it. Verified: one SDK copy when building from either casing.
- Same root cause made `vitest` fail with "failed to find the current suite"
  (scaffold tests too). It happens inside the vitest CLI before config loads,
  so it cannot be fixed in config: run unit tests from `D:\space`
  (PowerShell `Set-Location D:\space; npx vitest run`). All 11 pass there.
- My first wire-tap assertion failed because the SDK's `records.list_schemas`
  message lists column NAMES (e.g. `correctAnswer`). That is schema metadata,
  not data. Tightened the assertion to "no key values, no answerKeys records".
- Stopping the background dev server left its child holding port 5173; the
  CLI refusal shipped `deepspace dev kill --port 5173`, which fixed it.
- Test-account emails are global across all DeepSpace developers;
  `crew-a@deepspace.test` was taken. Used a random suffix.

Unsure / notes
- Column names of server-only collections are visible in schema metadata sent
  to clients. No values are. I consider this acceptable; flagging it for the
  security write-up.
- `displayName` comes from the caller's `users` row (fallback "Crew member").
  (Superseded: removed for the anonymous Crew Log, see the last section.)
- Everything is still mock data. Live AI is switched on after all phases,
  per the plan.

## Phase 3: Crew Log, visibility rules, live updates, upvotes (deployed)

Live release `rel_01M7YPC3N97TKS3PASAR7A5CKA` (still AI_MODE=mock).

Built
- `answers` now has `crew` (JSON userIds, the schema's `collaboratorsField`)
  and `upvoteCount`; read rule changed from `'own'` to `'shared'`
  (owner OR in crew; no visibilityField, so no public path).
- `syncCrew` (src/actions/crew.ts), run by `submitAnswer` after the create:
  re-query all answers for the scenario and set every row's `crew` to the full
  submitter set. Only rows whose crew differs are updated.
- `upvotes` collection (`uniqueOn: [answerId, userId]`, read `'own'`, no client
  writes) and `upvote` action: answer must exist, no self-upvote, caller must
  have submitted for that scenario, one vote per answer (checked + uniqueOn).
  The count is recomputed from the upvotes table each time (no drift under
  concurrent votes) and written to `answers.upvoteCount`, which the DO pushes
  live to the crew.
- UI: `CrewLog` (sorted by upvotes then time, framer `layout` reorders,
  new arrivals slide in and flash amber once), `UpvoteButton` (spring on vote,
  disabled for your own answer and after voting, aria-pressed), locked panel
  before you submit that reveals nothing, not even a count.

Tests
- `tests/crew-log.spec.ts` with the docs' `users` fixture and THREE accounts
  (A submits, B submits later, C never submits). Asserts on WebSocket frames
  and /api bodies: B receives nothing of A's answer before submitting; the
  server refuses B's getDebrief and upvote before B submits; after B submits
  both see each other's answers live without reload; A's UI upvote reaches B
  live; self-upvote (UI disabled + forged API call) and double upvote refused;
  C never receives either answer. Full e2e suite: 14 passed.
- `tests/tools/prod-crew.mjs` repeated the two-user flow on production: no
  leak before submit, live answer and live upvote, no console errors.

Bugs hit and fixes
- Core-loop test flaked: when the mock grader gave a low score, the verdict
  "Hold. Read the expert approach." also matched `getByText('Expert approach')`.
  Fixed with `{ exact: true }`. Test bug, not app bug.
- Mobile: the transmission count wrapped beside the heading, and the upvote
  button stretched to the card height. Header stacks on mobile; button is
  `self-start`.
- Lint: reading a ref during render to flag "fresh" entries; switched to state.

Unsure / notes
- Crew access costs O(n) updates per submit (n answers on the scenario).
  Fine at this scale; a per-scenario room would scale better but adds
  complexity the spec does not need.
- Answers saved in Phase 2 have `crew: []`. They stay visible to their owner,
  and the next submit on that scenario syncs them into the crew.
- Upvotes are one-way (no un-vote). SPEC only asks for upvote().

## Phase 4: exa sources and citations (deployed)

Live release `rel_01M7YPJZSG43J7PGMYS1N4RA7S` (AI_MODE=mock).

Built
- `findSources` in src/server/ai.ts. Live: `exa/search` with
  `includeDomains` = allowlist (nasa.gov, esa.int, eso.org, stsci.edu, major
  universities, ...), highlights + 1200 chars of text per result. Results are
  re-checked server-side (`https:` only, host must match the allowlist by
  suffix, PDFs skipped), de-duplicated by URL, capped at 3, titles trimmed of
  "| Site | Org" tails. Excerpts go to the model for grounding but are NOT
  stored (only `{title, url}` is saved on the scenario).
- A rotating sub-topic per track (6 per track) feeds the query, so successive
  scenarios in a track cover different ground.
- `generateScenario` now runs exa first, passes the sources to Claude with
  "base facts on these; do not contradict them", and stores them.
- Never blocks: a failed or empty search logs a warning and the briefing is
  written from well-established facts only.
- Mock mode returns the real (HTTP 200 checked) sources of the mock scenario
  it is about to generate.
- UI: briefing shows "Grounded in" [1]..[3] links; debrief repeats them under
  "Sources". Links open in a new tab with `rel="noopener noreferrer"` and an
  sr-only "(opens in a new tab)".

Verification
- One real `exa/search` call with the exact production body (topic "tidal
  disruption event black hole"), $0.007: 8 results, all reputable and on
  topic (NASA TESS/Swift TDE pages, MIT News, ESO "spaghettification" release,
  STScI Roman, Chandra/Harvard).
- Unit tests (14 total): allowlist/https/PDF filtering, de-dup, cap of 3,
  excerpt extraction, failed search returns [] instead of throwing.
- e2e core loop asserts the briefing has "Grounded in" with an https link to a
  reputable host and `rel=noopener`. Production smoke passed, no console errors.

Bugs hit and fixes
- Git Bash rewrote a `/scenario/...` CLI argument into a Windows path
  (`.../Git/scenario/...`). Use `MSYS_NO_PATHCONV=1` for such helper calls.
- Element screenshots taller than the viewport get clipped inside the app's
  internal scroll container; use a tall viewport for those captures.

Unsure / notes
- `includeDomains` limits exa to the allowlist; I re-check on our side anyway
  so a provider change cannot slip a blog link into a scenario.
- Live source quality per track is verified for one topic so far; the full
  live pass happens in step 4 (switch to live).

## Phase 5: fal images with fallback (deployed)

Live release `rel_01M7YPTQ2JW4RTN4J1FJ8XT8JN` (AI_MODE=mock, so the deployed
app shows the gradient fallback; images appear after the live switch).

Built
- `generateImage` in src/server/ai.ts: `fal/run-model` with
  `fal-ai/flux/schnell` (landscape_16_9, 4 steps, jpeg, safety checker on,
  `maxCostUsd: 0.05`), then polls `fal/get-result` (1.5s x 30). Returns the
  https image URL, or `null` for ANY problem (provider error, failed status,
  timeout, exception). Prompt built from the title + a per-track scene and
  always ends with "no text, no words, no letters, no writing, no logos"
  (DeepSpace design rule 9).
- Non-blocking by construction: `generateScenario` saves the scenario, then
  `enqueueJob(... 'scenario-image' ...)` and returns immediately. The job
  (src/jobs.ts, AppJobRoom) runs with an owner context (`buildCronContext`):
  owner-billed integration calls and an RBAC-bypassing `records.update` that
  writes `imageUrl`. The DO pushes the update, so open pages swap in the art
  live. Docs say to use JobRoom instead of `waitUntil` (killed after 30s).
- `ScenarioArt`: gradient "horizon" fallback (token colors + track glyph) is
  always underneath; the `<img>` is lazy, async-decoded, fades in over 700ms
  only after `onLoad`, and an `onError` keeps the gradient (covers expired or
  blocked image URLs too). No fade under reduced motion.

Verification
- One real fal run via the CLI (~$0.002): `run-model` -> `{jobId, status:
  IN_QUEUE}`; `get-result` -> `{status: COMPLETED, output.images[0]: {url,
  width: 1024, height: 576}}`. Shapes match the code. The image (Titan lander,
  navy shadows, amber horizon) had no text.
- Unit tests (17 total): mock returns null; live run -> poll -> url; provider
  failure, FAILED status, timeout, and thrown errors all return null; prompt
  contains the no-text clause.
- Production smoke after deploy: no regressions, no console errors.

Unsure / notes
- The job path (owner `integrations.call` inside AppJobRoom) only runs in live
  mode, so it gets its end-to-end check during the live switch.
- fal CDN URLs (`v3*.fal.media`) are not guaranteed permanent. The `onError`
  fallback covers expiry; persisting images to R2 would remove the risk but
  is out of scope for SPEC.

## Phase 6: /me progress, polish, error states (deployed)

Live release `rel_01M7YQ41AT0ZHAHRFZAGRHMY9C` (clean worktree, AI_MODE=mock).

Built
- `/me` flight record: Flown / Avg score / Upvotes received; per-track rows
  (glyph, flown count, average-score meter animated with `scaleX` for 60fps,
  `role="meter"` with aria values); past transmissions newest first, each
  linking back to its debrief. All derived from the user's own `answers`
  (SPEC: progress is derived, no extra collection).
- Nav: "Progress" item; on phones the wordmark collapses to the orbit mark
  (text stays for screen readers).
- Error states: `LoadError` (inline "Lost contact with Mission Control" +
  Reconnect) on track, scenario and /me pages when a live query errors;
  themed 404 ("Signal lost // 404"); action failures already show inline
  (answer box, Next briefing, Request briefing) or as toasts (upvotes); AI
  failures surface as friendly AiError text; images fall back to gradient.
- Accessibility: skip-to-content link, `main` is focusable target.

Tests
- `tests/progress.spec.ts`: all five track rows, a past answer opens its
  debrief, Progress nav link, zero console errors; 390 + 1440 screenshots.
- Full e2e suite: 15 passed (1 screenshot-only test skipped). Design gates
  (anti-AI grep, product-polish absence/presence) clean. Production smoke ok.

Bugs hit and fixes
- Mobile: wordmark wrapped to two lines next to two nav links; track names
  truncated by the "flown" label. Compact wordmark on phones; flown label
  moves under the bar.
- **Process bug (mine):** my commit chain piped each step through `grep`,
  which hid a correctly-refused commit (me.tsx depended on a file in the next
  commit). The chain continued and `deepspace deploy` shipped a dirty tree
  (GitHub source deploys the working tree; the release was flagged `dirty`).
  Fixed by committing the missing files (type-checked), confirming a clean
  tree, and redeploying: release `rel_01M7YQ41AT0ZHAHRFZAGRHMY9C` is clean.
  All later command chains use `set -o pipefail`.

Unsure / notes
- The /me title uses the first word of the display name ("Crew's missions."
  for test accounts named "Crew C"); real Google/GitHub names read naturally.

## Step 4: switch to live AI (deployed)

Release `rel_01M7YQ7WW2D239NX3GF4AT9Y74`, `AI_MODE = "live"` in wrangler.toml.

Before switching
- Preflight: one 20-token call confirmed `claude-sonnet-5-5` is accepted by
  `anthropic/chat-completion`.
- Bad-JSON acceptance test in the real UI (`tests/bad-json.spec.ts`, mock
  with `AI_MOCK_BAD_JSON="true"` locally, then set back): the request/grading
  error shows inline ("Houston received a garbled transmission"), the draft is
  kept, the button re-enables, no page errors.

Live results on https://orbit-lab.app.space (`tests/tools/prod-live.mjs`)
- generateScenario (exa + Claude): 10.8s. "Reading Huygens Through Titan's
  Winds", 137 words, specific role, ends with a question. Sources: NASA
  "Huygens' Path to Titan", NASA Science "Huygens Probe", NASA podcast on
  Dragonfly: real and on topic.
- fal image: background job finished and the image swapped in live 4.4s
  after the page opened. No text in the image.
- Grading: 3.4s. Generic answer -> 0/10 with specific misses. A strong,
  on-topic answer from a second user -> every rubric point under "Got right",
  verdict "Flight director signs off" (score >= 9). An off-topic answer (Titan
  text on a Mars briefing) was flagged by the grader as answering the wrong
  scenario.
- Cache/reuse: the second user's request returned the oldest scenario they
  had not answered first (a mock-era one), then the SAME live Huygens
  scenario A generated (same id, 1.1s, image already present). No second
  generation.
- Worker logs: no `[ai]` retry warnings, AppJobRoom alarm `ok`, every action
  logged with its caller.
- Spend so far (whole build incl. probes): fal $0.21 (6 calls), anthropic
  $0.09, exa $0.02. Free plan, 468/500 credits left.

Notes
- Production still contains scenarios/answers created by my smoke tests
  (mock-era scenarios, answers with ALPHA-/BRAVO- markers). Real users who
  answer those scenarios will see test answers in the Crew Log. Deleting them
  is irreversible, so I am leaving that decision to the owner.

## Step 5: security pass (results)

All checks run against production https://orbit-lab.app.space with live AI,
using `tests/tools/prod-security.mjs`, plus the local Playwright specs.

1. Answer keys and other users' answers are not sent before submitting
   (actual network payloads: every WebSocket frame and every /api response
   body the browser received was recorded and searched).
   - Crew C, who has not answered the Huygens scenario that A and B both
     answered, opened it: no `answerKeys` records, no correct-answer text (a
     snippet taken from A's own debrief), and neither A's nor B's answer text
     appeared anywhere in C's traffic. Crew Log showed "Locked".
   - Server refused C's `getDebrief` ("Transmit your answer first.") and C's
     `upvote` ("Transmit your own answer before voting.").
   - Locally, `tests/crew-log.spec.ts` proves the same for B before B submits
     and for C throughout, and `tests/core-loop.spec.ts` for the key.
   - Mechanism: `answerKeys` has `read: false` for every role (never synced);
     `answers` uses `read: 'shared'` with a server-maintained `crew` list.
   - Known, accepted: the SDK's `records.list_schemas` message tells every
     client the column NAMES of all collections (e.g. `correctAnswer`). No
     values. Schema shape is not secret.
2. Server rejections (all PASS on production):
   - double submit -> "You already transmitted an answer for this mission."
     (also enforced by `uniqueOn` in the DO for concurrent submits)
   - 1501-char answer -> "Answers are limited to 1500 characters."
   - non-string answer (`{ $ne: '' }`) -> refused
   - self-upvote -> "You cannot upvote your own answer."
   - double upvote -> "You already upvoted this answer." (+ `uniqueOn`)
   - unauthenticated `POST /api/actions/{generateScenario, submitAnswer,
     upvote, getDebrief}` -> HTTP 401
   - unauthenticated `POST /api/integrations/{anthropic/chat-completion,
     exa/search, fal/run-model}` -> HTTP 401 (scaffold default kept: no
     `anonymous: true` anywhere in src/integrations.ts)
   Result: 19/19 checks passed.
3. Client bundle grep (`vite build`, 32 files in dist/client) for
   `sk-ant-`, `sk-...`, JWT shapes `eyJ...`, `APP_OWNER_JWT`,
   `APP_IDENTITY_TOKEN`, private keys, `api_key=`, `x-api-key`, FAL/EXA/
   ANTHROPIC key names, Resend/GitHub/Google key shapes: **no matches**.
   Two benign hits for the word `correctAnswer`: the debrief renderer
   (`e.correctAnswer`, shown after submit) and the schema column definition.
   `.assetsignore` excludes `.dev.vars` and `wrangler.json` from uploads.
4. Secrets in git: no tracked file matches .env/.dev.vars/secret/credential/
   key/session/token patterns; `git log -p --all` has no key or JWT
   patterns; `.dev.vars`, `.deepspace/`, `.env*`, `dist`, `.wrangler` are
   ignored. `deepspace secrets list` -> "No secrets in prd": the app needs
   none, because integrations go through the DeepSpace proxy. Test-account
   passwords live only in `~/.deepspace/test-accounts.json` (never in repo).
5. Other hardening already in place
   - Grader prompt treats the learner answer as untrusted data in tags and
     ignores instructions inside it; score clamped 0-10 and rounded.
   - Spend control: generation only when the user has flown every existing
     scenario in the track, plus an 8/day per-user cap; buttons disabled
     while a call is in flight.
   - Actions run RBAC-off, so every ownership rule is explicit in code and
     every action logs its caller.

## Final deliverables

- Live URL: https://orbit-lab.app.space (name `orbit-lab` was free; no
  fallback name needed). App id `app_01M7YKTQV9V1MDHNM0J8KE3QKJ`.
- Source of truth: GitHub `vaishnavi1064/orbit-lab` (claimed on first deploy;
  `deepspace push` never run). Every commit type-checked before commit and
  pushed right after.
- README.md: what it is, how to run locally, mermaid architecture diagram,
  integrations and why, what was left out and why.
- WRITEUP_DRAFT.md: summary, integrations, main tradeoff, what the agent did,
  "What I verified" TODO bullets for the owner.
- Tests: `tests/core-loop.spec.ts`, `tests/crew-log.spec.ts` (3 users),
  `tests/progress.spec.ts`, `tests/bad-json.spec.ts` (opt-in), scaffold
  smoke/api/collab specs; `src/server/ai.test.ts` (17 unit tests);
  production scripts in `tests/tools/`.

Open items for the owner
- Production test data: removed on 2026-11-21 after the owner confirmed (see
  "Production test-data cleanup" below).
- fal image URLs are CDN links that may expire; the UI falls back to the
  gradient. Persisting to R2 is the fix if that matters.
- Test accounts Crew A / Crew B (suffix `-bc3fce`) and Crew C live in the
  shared DeepSpace test pool for this machine.

## Production test-data cleanup (2026-11-21, owner confirmed)

Scope agreed with the owner: delete everything created by the test accounts
(Crew A/B/C) or containing ALPHA-/BRAVO-, plus the mock-era scenarios, but
keep the live-generated Huygens scenario and its answer key. Never touch
`users`.

1. Inventory, read-only (`tests/tools/prod-inventory.mjs`, 3112185). The
   owner's CLI agent tools see 0 answers, upvotes and answer keys (RBAC: not
   crew, own-only, deny-all), and the agent route rejects app JWTs. So the
   script signs in as each test account and records the WebSocket frames the
   app's own pages receive. Found 6 scenarios (5 mock, 1 live), 9 answers
   (A 6, B 3), 2 upvotes, and 6 answer keys inferred (id = scenario id). The
   stored upvoteCounts matched the 2 visible upvotes, so there were no hidden
   votes by other users.
2. Mechanism. No collection allows client deletes, so, following the docs
   (server actions bypass RBAC; owner-only action pattern), a temporary
   action `cleanupTestData` was added (270b100). It could only delete
   hard-coded record ids, was callable only by the owner or the two test
   accounts, defaulted to a dry run, read every collection except `users`,
   refused to delete if any record existed that was not on the expected
   list, and returned ids only (never key content).
3. Dry run (release rel_01M7ZJXWWH4WW0V2JDFTHJZPQ7): upvotes 2 of 2, answers
   9 of 9, answerKeys 6 total (5 to delete), scenarios 6 total (5 to delete);
   missing 0, unexpected 0. This confirmed the inferred key count and showed
   there were no orphan keys.
4. Delete, in order upvotes, answers, answerKeys, scenarios: 2, 9, 5, 5
   deleted. A second dry run showed 0 upvotes, 0 answers, 1 answer key and 1
   scenario (Huygens, planets #2, image intact).
5. Removed the action (0ec3c96; source identical to before it was added)
   and redeployed clean (rel_01M7ZK0TBY7JY3QR9HV5VSZTFT). POST
   /api/actions/cleanupTestData now returns 404.
6. prod-smoke re-run on `iss-ops`, not planets, so its canned answer would
   not land on Huygens. A new live scenario, "Scrubber Offline During Cabin
   Repair", was generated; no answer-key data on the wire before submit;
   debrief shown (score 0, expected, since the canned answer is about a Mars
   rover); stored debrief on revisit; image arrived; 0 console errors.

Left in production afterwards: Huygens (planets #2, no answers) and the new
ISS Ops scenario with one Crew A answer from the smoke run. The next Planets
scenario will be numbered #3 (numbering is max + 1).

Follow-up, same day (owner confirmed): removed that smoke-run answer with
the same pattern. A read-only inventory found exactly one answer
(`1795282787607_m4y4hd`, Crew A, score 0) and no upvotes. A temporary action
(7338f65, release rel_01M7ZKR57GH8D9S1BV412YDGEG) with that one id hard-coded
and an expected state of 2 scenarios, 2 answer keys, 1 answer and 0 upvotes
dry-ran clean (unexpected 0), deleted 1 answer, and a second dry run showed
0 answers, 0 upvotes, 2 answer keys, 2 scenarios. The action was removed
(c9aa317, src identical to 0ec3c96) and redeployed clean
(rel_01M7ZKT28CVH7S7Y5N11JW4S3K); the signed-in call now returns 404.

Production now holds: 2 scenarios (Huygens planets #2, "Scrubber Offline
During Cabin Repair" iss-ops #1), their 2 answer keys, 0 answers, 0 upvotes.

Rule from the owner from here on: do not run any script that writes to
production (prod-smoke, prod-live, prod-crew, prod-security) unless asked.
The owner does the remaining production checks by hand.

## Anonymous Crew Log (deployed after the owner said "deploy")

Owner request: show "Crew member N" (N = order of submission for that
scenario, from 1) instead of real names, "You" for your own entry, and stop
storing or sending names on answers so they never reach other users'
browsers. Progress page unchanged. Deviation from SPEC.md, on the owner's
explicit instruction: the spec lists `displayName` on answers; it is gone.

What changed
- `src/lib/crew.ts` (41bca5c): `crewNumbers` sorts a scenario's answers by
  `createdAt` (ties by `recordId`) and numbers them from 1; `crewLabel` gives
  "You" or "Crew member N". Computed in the browser: every crew member reads
  all of a scenario's answers (DO-enforced), so every viewer gets the same
  numbers, and no new column is needed. `CrewEntry` shows the number in the
  avatar and "You" in amber for your own entry (replaces the old "You" badge,
  so it is not shown twice). 4 new unit tests.
- No names on answers (9509c20): `displayName` removed from the `answers`
  schema, `AnswerData`, and `submitAnswer`; the unused `displayNameFor`
  helper is deleted. Answers keep `userId` (needed for `ownerField`, `crew`
  RBAC and "is this mine"), which is an opaque id, not a name.
- Found by the new wire test, not by reading code (b86a35b): the SDK's
  `user.list` roster frame is pushed to every signed-in socket and, by
  default, contains every user's `{ id, name, role, lastSeenAt }` (the docs'
  "public-identity projection"; no emails). With `userId` on each answer,
  that would have let anyone map "Crew member 2" back to a real name. This
  was already true in production before this change. Fix, per the docs'
  users-directory privacy contract: `roster: 'read-policy'` on the users
  schema, so a member's roster holds only the rows `read: 'own'` grants,
  i.e. themselves. Nothing in the app uses `useUsers`, `useUserLookup` or
  `usePresence` for peers; the nav still shows your own name (scaffold collab
  test passes).
- Schema note: the docs say removing a column is not migrated (the SQLite
  column stays). Production has 0 answers, so there are no stored names to
  clean up; new answers never write it.

Tests (c3244d3), local only, AI_MODE switched to mock for the run and
restored to live before committing
- `tests/crew-log.spec.ts` (3 real users) now also asserts: own entry label
  "You" for A and B; A sees B as "Crew member 2", B sees A as "Crew member
  1"; the Crew Log never renders the other user's name; and across every
  WebSocket frame and /api body each browser received, there is no
  `"displayName"` and no other user's name or email.
- First run failed exactly on that last check ("Crew A's browser received
  Crew B's name", in the `user.list` frame), which is how the roster leak
  was found. After the roster fix: e2e 16 passed, 1 skipped (opt-in
  bad-JSON); vitest 21 passed; tsc clean. Screenshots at 1440 and 390 show
  "1 You / Crew member 2" for A and "2 You / Crew member 1" for B.

Deployed from 13620a9 (clean tree, AI_MODE live): release
rel_01M7ZS37PPGPF6QHPKFQPT54SX. Read-only checks only, per the owner:
- GET /, /home, /api/auth/ok: 200. `deepspace logs --level error` since
  the deploy: 0 lines.
- Live schema (`agent invoke schema_describe`): `answers` columns have no
  `displayName`; `users` has `roster: "read-policy"`.
- Signed in as Crew A and as Crew C, opened /home, the Huygens scenario and
  /me with no clicks (0 action POSTs): every `user.list` frame held exactly
  one user (the viewer), no other user's name anywhere on the wire, no
  `"displayName"`, 0 console errors. Only side effect: the platform refreshes
  the viewer's own `lastSeenAt` when a signed-in page connects.
