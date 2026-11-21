# Orbit Lab: SPEC

## What it is
A scenario-based space-science learning app on the DeepSpace SDK.
Users pick a track, read an immersive mission scenario, write what they
would do, and get graded feedback grounded in real sources. After
submitting, they can see how others answered the same scenario (Crew Log)
and upvote the best explanations. NOT a game: no timers, no competition.

## Working rules for you (the agent)
- Read the deepspace skill and docs.deep.space before writing code.
- Run `npx deepspace integrations list` and `integrations info <name>/`
  before calling any integration. Never guess endpoint names.
- Use platform primitives (auth, RecordRoom sync, roles, files).
  Do not reimplement them.
- ALL integration calls happen server-side. No keys in client code.
  Keep the default that integrations require a signed-in caller.
- Build in the phases below. After each phase: run it, deploy with
  `npx deepspace deploy`, and stop so I can verify.
- Keep NOTES.md: a log of each decision you made, each bug you hit,
  and how it was fixed. I will use it for my writeup.
- If something in the docs contradicts this spec, tell me before
  working around it.

## Tracks
iss-ops, spacecraft-launch, orbits-gravity, black-holes-stars, planets

## Data model
- scenarios (public): id, track, title, briefing, imageUrl,
  sources[{title,url}], createdAt
- answerKeys (SERVER-ONLY): scenarioId, correctAnswer, rubric[]
  A user may read the key for a scenario ONLY after they have
  submitted an answer to it.
- answers: id, scenarioId, userId, displayName, text, score (0-10),
  gotRight[], missed[], createdAt
  Before a user submits for a scenario, they cannot read anyone's
  answers for it. After submitting, they can read all answers for it.
- upvotes: answerId, userId (one per user per answer, no self-upvotes)
- progress: derived from answers (avg score per track)

## Server actions
1. generateScenario(track)
   - exa: find 2-3 reputable sources (NASA, ESA, university) for a
     realistic scenario in this track.
   - anthropic: given sources, return STRICT JSON
     {title, briefing, correctAnswer, rubric:[string]}.
     Validate with a schema; retry once on bad JSON; else show error.
   - fal: one illustration from the title (cinematic, no text).
     If fal fails, use a fallback gradient. Never block on it.
   - Save scenario publicly, key to answerKeys.
   - Reuse existing scenarios: only generate a new one when the user
     has finished all existing ones in that track.
2. submitAnswer(scenarioId, text)
   - one answer per user per scenario, max 1500 chars
   - anthropic grades against the rubric + correctAnswer, returns
     STRICT JSON {score, gotRight:[], missed:[]}
   - save answer, then return feedback + correctAnswer + sources
3. upvote(answerId)

## Pages
- / : landing hero (animated starfield), track cards, sign in
- /track/:id : list of scenarios, done/not done, avg score
- /scenario/:id : briefing with image, answer box, then feedback
  panel (score ring, got right, missed, correct answer, sources),
  then Crew Log (answers sorted by upvotes, live updates)
- /me : progress per track, past answers

## Design direction
Dark, cinematic, "mission control" feel. Deep navy/black background,
subtle animated starfield (CSS/canvas, cheap), one accent color.
Monospace for mission labels, clean sans for body. Briefings appear
like a transmission (light typewriter reveal). Mobile-friendly.
Loading states with space copy ("Contacting Houston..."). Never show
a blank screen while AI runs.

## Phases (deploy after each)
1. Scaffold, auth, tracks page, static UI shell with starfield. DEPLOY.
2. generateScenario with anthropic only (no exa/fal yet), scenario page,
   submitAnswer + feedback. DEPLOY. <- core loop, must work.
3. Crew Log: answer visibility rules, live updates, upvotes. DEPLOY.
4. exa sources + citations. DEPLOY.
5. fal images with fallback. DEPLOY.
6. /me progress page, polish, error states. DEPLOY.
Stretch: elevenlabs narration of briefing.

## Acceptance tests (I will check these myself)
- Two accounts: B cannot see A's answer or the correct answer before
  B submits. Verify in the browser network tab, not just the UI.
- After both submit, answers and upvotes appear live for both.
- Cannot upvote own answer; cannot upvote twice; cannot submit twice.
- Signed-out user cannot trigger any integration.
- No API keys in the client bundle.
- Bad JSON from the model shows an error, not a crash.
- Source links are real and relevant.

## Non-goals (and why)
- Payments: nothing to sell in a learning app.
- Real-time chat: Crew Log covers the social layer with less moderation risk.
- Native mobile: responsive web is enough here.