# Orbit Lab: write-up draft

Live app: https://orbit-lab.app.space
Code: https://github.com/vaishnavi1064/orbit-lab

## What I built

Orbit Lab is a space-science learning app built around realistic mission
scenarios. You choose one of five tracks (ISS Operations, Spacecraft and
Launch, Orbits and Gravity, Black Holes and Stars, Planets), read a briefing
that arrives like an incoming transmission, and write what you would do.
Claude grades the answer against a hidden rubric and expert answer, and the
debrief shows a score, what you got right, what you missed, the expert
approach, and the real NASA and ESA sources the scenario was based on.

Once you have submitted, the Crew Log opens: you can read how everyone else
answered the same scenario and upvote the best explanations. New answers and
votes appear live. A progress page shows your average score per track and
every answer you have sent.

It is deliberately not a game. There are no timers and no leaderboards. The
look is a mission-control console at night: navy panels, one amber accent, a
slow starfield, monospace mission labels.

## DeepSpace features and integrations used

- **Synced records (RecordRoom)** as the only database: scenarios, answer
  keys, answers, and upvotes, with live updates over WebSockets.
- **Role-based access rules** enforced in the Durable Object. Answer keys
  cannot be read by any role. Answers can only be read by their author and by
  people who have answered the same scenario.
- **Server actions** for every write: generating scenarios, submitting and
  grading answers, upvoting, and fetching your own debrief.
- **Background jobs** for image generation, so a slow image never holds up a
  briefing.
- **Auth** with Google or GitHub sign-in; every action and integration call
  requires a signed-in user.
- **Integrations through the DeepSpace proxy, server-side only, with no API
  keys in the app:**
  - Anthropic (`claude-sonnet-5-5`) writes the scenarios and grades the
    answers, returning strict JSON that is validated and retried once.
  - Exa finds 2 to 3 sources from reputable domains (NASA, ESA, ESO, STScI,
    universities) so each scenario is grounded and cited.
  - fal (`flux/schnell`) paints one illustration per scenario, with a
    gradient fallback if anything goes wrong.
- **Deploys** to app.space with GitHub as the source of truth.

## The main tradeoff

The hardest requirement was the Crew Log rule: you cannot see anyone's
answer to a scenario until you have answered it yourself, and after that you
see all of them live.

DeepSpace's access rules can say "the owner can read this row" or "people on
this row's collaborator list can read it", but not "people who have a row in
another collection". I had three options:

1. Hide answers in the UI. Simple, but anyone could read them from the
   network traffic, so it fails the requirement.
2. Serve the Crew Log only through a server action. Secure, but no live
   updates.
3. Keep a `crew` list on every answer (everyone who has answered that
   scenario), mark it as the collaborator field, and have the server update
   it on every submission.

I chose option 3. The database itself decides who receives each answer, so
the rule holds even against someone reading raw WebSocket traffic, and
because the database re-checks access on every change, a newly unlocked
answer is pushed to the right people instantly. The cost is that every new
submission updates every existing answer for that scenario. That is fine for
a learning app at this scale, and I noted it as the first thing to change if
the app grew (for example, a separate room per scenario).

A second, smaller tradeoff: scenarios are generated once and shared. A new
one is only generated when you have finished every existing scenario in a
track. This keeps AI spend low and lets the Crew Log fill up, at the cost of
everyone seeing the same scenarios in the same order.

## What the agent did

I used Claude Code as the builder, with a written spec (SPEC.md) as the source
of truth and explicit rules: read the DeepSpace docs first, never guess
integration endpoints, build in phases, test and deploy after each phase,
commit small changes, and log every decision and bug.

Claude Code:

- Read the DeepSpace skill and documentation, ran `integrations list` and
  `info`, and wrote the exact request and response shapes into NOTES.md
  before calling anything. Where the docs and the installed SDK disagreed (on
  whether integrations accept signed-out callers), it checked the installed
  code and documented which one it followed.
- Wrote the architecture and the design system (DESIGN.md) before writing
  code, then built six phases: shell and starfield, core loop, Crew Log, exa
  sources, fal images, and the progress page with error states.
- Built everything first against a mock AI mode with realistic canned
  scenarios, then switched to live AI and checked real output quality.
- Wrote automated tests, including a three-user test that records every
  network message and proves the hidden data never reaches a user who should
  not see it, plus scripts that run the same checks against the live site.
- Took mobile and desktop screenshots after each phase and fixed layout
  problems it found.
- Found and fixed real bugs: the most interesting was a crash that only
  happened in production, caused by Windows drive-letter casing making the
  bundler include the DeepSpace SDK twice. It also caught its own process
  mistake once (a deploy that shipped uncommitted files), fixed it, and
  recorded it.
- Made the Crew Log anonymous ("Crew member N", "You" for your own entry,
  no names stored on answers), and the new network test caught a real leak:
  DeepSpace's default user roster sent every user's name to every browser,
  which would have unmasked the labels, so it scoped the roster to each
  user's own row.

Everything it did, including the mistakes, is logged phase by phase in
NOTES.md.

## What I verified

- TODO: Two accounts: B cannot see A's answer or the correct answer before B
  submits (checked in the browser network tab).
- TODO: After both submit, answers and upvotes appear live for both.
- TODO: Cannot upvote my own answer, cannot upvote twice, cannot submit twice.
- TODO: Signed out, I cannot trigger any integration.
- TODO: No API keys in the client bundle.
- TODO: Bad JSON from the model shows an error, not a crash.
- TODO: Source links are real and relevant.
- TODO: Mobile (390px) and desktop layouts, reduced motion, keyboard focus.
- TODO: Anything else I tested myself.
