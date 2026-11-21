# Orbit Lab: Writeup

Live: https://orbit-lab.app.space

## What I built
Orbit Lab is a space-science learning app built around realistic mission scenarios. You pick a track (ISS Operations, Spacecraft & Launch, Orbits & Gravity, Black Holes & Stars, Planets), read a briefing, and write what you would do. Claude grades your answer against a hidden rubric, and the debrief shows what you got right, what you missed, the expert approach, and the real NASA/ESA sources the scenario was built from. After you submit, the Crew Log unlocks: you see how others answered the same scenario, live, anonymously, and can upvote the best explanations. Progress per track stays private.

## DeepSpace primitives
- RecordRoom as the only database, with live sync for the Crew Log and upvotes
- RBAC: answer keys are unreadable by every role, even admin; answers are readable only by people who have answered that scenario
- Server actions for every write (generate, submit, upvote, debrief), backed by uniqueOn constraints
- Background jobs for image generation, so a slow image never blocks a briefing
- Auth, with every action and integration requiring a signed-in user
- Integrations, server-side only, no API keys in the app:
  - anthropic: writes scenarios and grades answers (strict JSON, schema-validated, one retry)
  - exa: 2-3 sources from an allowlist of NASA, ESA, and universities, re-checked on the server
  - fal: one illustration per scenario, with a gradient fallback

I left out payments, chat, and voice narration because they don't improve learning here.

## Main tradeoff
The core rule is: you can't see anyone's answer until you submit yours. Hiding answers in the UI would leak them over the network, and serving them only through an action would lose live updates. I put a "crew" list on each answer (everyone who answered that scenario) and made it the collaborator field, so the database decides who receives each answer and pushes newly unlocked ones live. The cost is O(n) writes per submission. That's fine at this scale; with more time I'd move to per-scenario rooms.

## Where the agent helped
I used Claude Code with a written spec, phased build, and strict rules: read the DeepSpace docs first, never guess integration endpoints, server-side only, mock AI first, small commits, and log every decision and bug in NOTES.md. It built the six phases, the tests (including a three-user test that checks raw network traffic), and found a production-only crash caused by Windows drive-letter casing bundling the SDK twice.

## What I verified and changed
- Stopped the build after the core loop to test it myself before continuing.
- Two-browser test on the live site: before submitting, the second account received no answer text or names over the WebSocket; after both submitted, answers and upvotes appeared live; self-upvote was blocked.
- The agent claimed a strong answer got full credit, but its script had read "5/10" mid-animation. I checked the stored data: the answer was saved as 10/10.
- Tested the full flow on my phone.
- Had all test data removed from production with a dry run first. The agent's own smoke test then put a test answer back, so I had it removed and set a rule: no automated writes to production.
- While testing, I noticed the Crew Log showed real names next to scores. I asked for anonymity enforced at the network level, not just on screen. The new network test then caught that DeepSpace's default user roster was sending every user's name to every browser, a leak present since the first deploy. Fixed with roster: 'read-policy' and verified on production.

## What I'd do next
Per-scenario rooms for the Crew Log, more consistent grading (grade twice and compare), spaced repetition for low-scored scenarios, and copying images into R2 so they never expire.
