# Orbit Lab: design system

Written before any UI code. Follows the DeepSpace `/design/*` workflow
(Direction, Style Tile, product polish, anti-AI gate) plus the project's
frontend brief.

## Design Direction

- **Product:** A self-paced lab where space-science learners read a mission
  scenario, write what they would do, and get graded feedback grounded in
  NASA and ESA sources.
- **Emotion:** The hush in a control room the second a transmission comes in.
  Headset on, coffee cold, every console leaning toward one screen.
- **Metaphor:** A flight director's console at night: amber status lamps on a
  dark navy panel, telemetry typed onto paper strips, a window full of stars.
- **References (outside edtech):**
  1. Apollo Flight Plan printouts: monospaced, dense, numbered, utilitarian.
  2. Braun ET66 calculator: dark body, one warm accent key, nothing extra.
  3. Solari split-flap departure boards: rows of codes that tell you where
     you are going.
- **Signature element:** the *incoming transmission* panel. A mono header
  (`MISSION 04 // ISS OPERATIONS`), a single amber scanline that sweeps once,
  then the briefing types in like a teleprinter.
- **Hero visual:** a layered canvas starfield drifting with slow parallax
  behind a thin elliptical orbit line; a small amber craft traces the orbit
  once every 24s. Static for reduced motion.
- **Sentence test:** the console/teleprinter framing, mission codes, and
  graded-transmission loop don't describe a generic quiz app or SaaS tool.

## Style Tile

- **Color:** near-black navy dominant, desaturated blue-grey secondary, a
  single warm amber accent for actions, focus, and scores only.
- **Type:** Space Grotesk (headings) + Inter (body) + IBM Plex Mono
  (mission labels). Space Grotesk is a technical grotesque with clear,
  slightly engineered letterforms; Inter disappears in long briefings; Plex
  Mono reads like a flight-plan printout.
- **Theme:** dark. You look at stars in the dark; a light theme would be a lie.
- **Art direction:** technical minimalism with an instrument-panel tilt.
  Hairline borders, numbered labels, generous negative space, no blobs.
- **Motion personality:** mechanical calm. Ease-out, short, deliberate.
  One continuous element (the starfield). Everything else runs once.
- **Voice:** second person; mission-control verbs (Brief, Transmit, Debrief);
  headlines max 8 words; no exclamation points; no em dashes.

## Palette (semantic tokens, theme id `orbit`)

Defined once in `src/styles.css` under `[data-theme="orbit"]`. JSX uses
tokens only (`bg-background`, `text-primary`...), never hex or `amber-400`.

| Token                  | Value     | Use |
| ---------------------- | --------- | --- |
| `--color-background`   | `#060a13` | Page, deep space |
| `--color-foreground`   | `#e7ecf5` | Body text (17.6:1 on background) |
| `--color-card`         | `#0c1322` | Panels, consoles |
| `--color-muted`        | `#111a2d` | Inset wells, skeletons |
| `--color-muted-foreground` | `#94a0b8` | Secondary text (7.4:1 on background) |
| `--color-border`       | `#1d2940` | Hairlines |
| `--color-primary`      | `#ffb547` | THE accent: CTAs, focus ring, score, active lamp (11.9:1 on background) |
| `--color-primary-foreground` | `#1b1204` | Text on amber |
| `--color-secondary`    | `#16213a` | Secondary buttons, chips |
| `--color-accent`       | `#1a2742` | Hover wash on dark surfaces (not a second hue) |
| `--color-ring`         | `#ffb547` | Focus outline |
| `--color-destructive`  | `#f06a5c` | Errors only |

60/30/10: navy background and cards / blue-grey text and borders / amber.
No gradients except the fallback scenario art (navy to deeper navy with an
amber horizon glow, built from tokens).

## Typography

| Role | Font | Size / weight | Notes |
| ---- | ---- | ------------- | ----- |
| Display (hero) | Space Grotesk | 56-88px / 600, tracking -0.03em | Hero only, 3-8 words |
| H1 page | Space Grotesk | 32-44px / 600 | |
| H2 section | Space Grotesk | 22-26px / 600 | |
| Body | Inter | 16px / 400, line-height 1.65 | Briefings at 17px, max 68ch |
| Small | Inter | 14px | |
| Label | IBM Plex Mono | 11-12px / 500, uppercase, tracking 0.18em | `MISSION 04 // ISS OPERATIONS` |
| Data | IBM Plex Mono | 13-14px, tabular | Scores, counts |

Loaded from Google Fonts in `index.html` with `display=swap` and preconnect.
Headline is at least 3x body (hard rule 10).

## Spacing, shape, layout

- 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 6px controls, 10px panels. Technical, not bubbly.
- Content widths: reading column 680px; app pages 1120px; 16px gutters on
  mobile, 24-32px desktop.
- Borders over shadows. Elevation = a 1px border plus an inner top highlight;
  hover glow is an amber `box-shadow` ring at low alpha via a token utility.
- Layouts are asymmetric: label column + content column on desktop, stacked
  on mobile. No centered-card-on-gradient screens.

## Motion principles

| Moment | Motion | Duration / easing | Reduced motion |
| ------ | ------ | ----------------- | -------------- |
| Starfield | 3 depth layers, parallax on pointer/scroll, slow drift | continuous, rAF, ~1 draw per frame, paused when tab hidden | static stars, no rAF loop |
| Page enter | fade + 8px rise | 280ms `[0.22,1,0.36,1]` | fade only |
| Card hover | lift 4px + amber hairline + glow | 180ms ease-out | color change only |
| Lists | stagger children | 60ms step, max 8 items animated | no stagger |
| Briefing | one scanline sweep, then typewriter ~16ms/char, capped at 2.4s, click/Enter to skip | once | full text instantly |
| Grading wait | rotating mission-control copy ("Contacting Houston...") + scanning bar | 2.2s per line | copy rotates, no bar motion |
| Score ring | stroke draws 0 to score, number counts up | 900ms ease-out, once | final state instantly |
| Feedback items | stagger in | 70ms step | instant |
| Crew Log new answer | slide in from top + amber flash on border | 320ms spring (stiffness 380, damping 30) | instant |
| Upvote | icon spring scale 1 to 1.25 to 1 | spring | none |

All motion is wrapped in `<MotionConfig reducedMotion="user">`; rAF/timer loops
(starfield, typewriter) check `useReducedMotion()` manually (hard rule 13).
Only `transform` and `opacity` animate, for 60fps.

## Component sketches

### 1. Track card (landing + /tracks)

```
+--------------------------------------------+
|  TRK-02                           [glyph]  |   <- mono label, custom SVG glyph
|                                            |
|  Spacecraft & Launch                       |   <- Space Grotesk 22px
|  Max-Q, staging, abort modes, the          |
|  rocket equation.                          |   <- Inter 14px, muted
|                                            |
|  ---------------------------------------   |   <- hairline
|  3 MISSIONS  ·  AVG 7.4          BRIEF ->  |   <- mono data, amber arrow
+--------------------------------------------+
 hover: translateY(-4px), border -> amber, soft amber glow, arrow nudges 2px
 focus-visible: 2px amber outline, offset 3px
```

Five tracks laid out as an asymmetric bento (two wide, three narrow on
desktop; single column on mobile), not three identical cards.

### 2. Briefing panel (incoming transmission)

```
+----------------------------------------------------------+
| ● INCOMING TRANSMISSION          MISSION 04 // ISS OPS   |  <- mono, lamp pulses once
|----------------------------------------------------------|
| [ scenario art 16:9, lazy, gradient fallback ]           |
|==========================================================|  <- amber scanline sweeps once
| Coolant loop B is reading 4 °C above nominal and         |
| climbing. The crew reports a faint ammonia smell in the  |
| Destiny module_                                          |  <- typewriter caret
|                                                          |
| SOURCES  [1] NASA ISS ECLSS overview  [2] ...            |
+----------------------------------------------------------+
| YOUR CALL                                    0 / 1500    |
| [ textarea ........................................ ]    |
|                                        [ Transmit -> ]   |
+----------------------------------------------------------+
```

### 3. Feedback score ring (debrief)

```
   .-""""-.        DEBRIEF // MISSION 04
  /  .--.  \       Score 7 / 10
 |  ( 7 )   |      ------------------------------
  \  '--'  /       GOT RIGHT
   '-....-'        ■ Isolated the leaking loop first
  amber arc        ■ Considered crew safety before diagnosis
  draws 0->7       MISSED
                   □ Did not mention the ammonia contingency mask
                   CORRECT APPROACH
                   (paragraph)
                   SOURCES [1] [2] [3]
```

SVG circle, `stroke-dasharray` driven by score/10, number counts up in Plex
Mono. Ring track uses `--color-muted`, arc uses `--color-primary`.

## Accessibility checklist

- Text contrast at least 4.5:1 (values above are well over).
- `*:focus-visible` amber outline kept from the scaffold, never removed.
- All interactive things are buttons/links/primitives, never `div onClick`.
- Live regions: grading status and new Crew Log entries use `aria-live="polite"`.
- Typewriter text is in the DOM in full for screen readers (`aria-label` on
  the container holds the full briefing; the visual reveal is `aria-hidden`).
- Tap targets at least 44px on mobile.
