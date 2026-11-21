/**
 * Canned, realistic content for AI_MODE=mock. Two scenarios per track.
 * Every source URL was checked to return HTTP 200 when this file was written.
 * `keywords` drive the mock grader: a rubric point counts as covered when the
 * answer mentions any of its keywords.
 */

import type { TrackId } from '../lib/tracks'
import type { Source } from '../lib/types'

export interface MockRubricPoint {
  point: string
  keywords: string[]
}

export interface MockScenario {
  track: TrackId
  title: string
  briefing: string
  correctAnswer: string
  rubric: MockRubricPoint[]
  sources: Source[]
}

const NASA_ISS: Source = { title: 'NASA: International Space Station', url: 'https://www.nasa.gov/international-space-station/' }
const ESA_ISS: Source = {
  title: 'ESA: International Space Station',
  url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station',
}
const ESA_DEBRIS: Source = { title: 'ESA: Space Debris', url: 'https://www.esa.int/Space_Safety/Space_Debris' }
const GRC_AERO: Source = { title: 'NASA Glenn: Rocket Aerodynamics', url: 'https://www.grc.nasa.gov/www/k-12/rocket/rktaero.html' }
const GRC_THRUST: Source = { title: 'NASA Glenn: Rocket Thrust Summary', url: 'https://www.grc.nasa.gov/www/k-12/rocket/rktthsum.html' }
const ESA_LAUNCH: Source = { title: 'ESA: Space Transportation', url: 'https://www.esa.int/Enabling_Support/Space_Transportation' }
const JPL_BASICS: Source = { title: 'NASA: Basics of Space Flight', url: 'https://science.nasa.gov/learn/basics-of-space-flight/' }
const JPL_ORBITS: Source = {
  title: 'NASA: Basics of Space Flight, Trajectories',
  url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/',
}
const NASA_BH: Source = { title: 'NASA Science: Black Holes', url: 'https://science.nasa.gov/universe/black-holes/' }
const NASA_BH_TYPES: Source = { title: 'NASA Science: Black Hole Types', url: 'https://science.nasa.gov/universe/black-holes/types/' }
const NASA_STARS: Source = { title: 'NASA Science: Stars', url: 'https://science.nasa.gov/universe/stars/' }
const NASA_STAR_TYPES: Source = { title: 'NASA Science: Star Types', url: 'https://science.nasa.gov/universe/stars/types/' }
const NASA_MARS: Source = { title: 'NASA Science: Mars', url: 'https://science.nasa.gov/mars/' }
const NASA_TITAN: Source = { title: 'NASA Science: Titan', url: 'https://science.nasa.gov/titan/' }

export const MOCK_SCENARIOS: MockScenario[] = [
  // ── ISS Operations ────────────────────────────────────────────────────────
  {
    track: 'iss-ops',
    title: 'Ammonia in the Cabin',
    briefing:
      'It is 02:14 station time. A caution tone wakes the crew: the cabin air monitor reports a rising ammonia reading in the US segment, and the external thermal control loop B shows a pressure drop. Ammonia is the coolant in the station\'s external loops; inside the cabin it is toxic at low concentrations. One crew member says they can smell something sharp near the Destiny lab. Mission Control has not called yet. You are the commander. What do you do in the next five minutes, and what do you do after that?',
    correctAnswer:
      'Treat it as a toxic atmosphere emergency first and a hardware problem second. The crew immediately dons respirators or emergency masks, accounts for every crew member, and evacuates to the Russian segment, closing hatches behind them so the US segment is isolated. The commander reports to Mission Control, which can remotely isolate the leaking loop or heat exchanger and command fans and valves. Nobody re-enters until air samples from portable monitors show the ammonia level is safe; only then does the team troubleshoot loop B.',
    rubric: [
      { point: 'Crew dons respirators or emergency masks immediately', keywords: ['mask', 'respirator', 'breathing', 'oxygen mask', 'pba'] },
      { point: 'Evacuates to the Russian segment and closes hatches to isolate the US segment', keywords: ['russian segment', 'hatch', 'evacuate', 'isolate the us'] },
      { point: 'Accounts for all crew members', keywords: ['account', 'headcount', 'all crew', 'everyone'] },
      { point: 'Contacts Mission Control to isolate the leaking loop remotely', keywords: ['mission control', 'houston', 'ground', 'mcc'] },
      { point: 'Samples the air before anyone re-enters', keywords: ['sample', 'monitor', 'measure', 're-enter', 'reenter', 'safe level'] },
    ],
    sources: [NASA_ISS, ESA_ISS],
  },
  {
    track: 'iss-ops',
    title: 'Conjunction at 3 AM',
    briefing:
      'Ground radar has updated the track on a fragment of an old upper stage. The latest estimate puts its closest approach to the station at under 1 km in 70 minutes, with a collision probability above the red threshold. A planned avoidance burn needs about 2.5 hours of preparation, so there is no time to move the station. The crew is asleep. You are the flight director. Walk through your decision and the crew\'s actions until the fragment has passed.',
    correctAnswer:
      'With probability above the red threshold and no time for a debris avoidance maneuver, the safe call is to shelter in place. Wake the crew, close hatches between modules to limit the volume that could depressurize, and have the crew shelter in their docked return vehicles (Soyuz, Crew Dragon) with hatches closed, ready to undock if the station is hit. After the time of closest approach passes, the crew reopens hatches only after checking module pressure for a leak. The event goes into the planning loop: earlier tracking would have allowed an avoidance burn.',
    rubric: [
      { point: 'Weighs collision probability and time available against the avoidance burn lead time', keywords: ['probability', 'threshold', 'not enough time', 'no time', 'too late', 'lead time'] },
      { point: 'Shelters the crew in their return vehicles', keywords: ['soyuz', 'dragon', 'return vehicle', 'lifeboat', 'capsule', 'shelter'] },
      { point: 'Closes hatches between modules', keywords: ['hatch', 'close'] },
      { point: 'Prepares to undock if the station is struck', keywords: ['undock', 'ready to leave', 'separate'] },
      { point: 'Checks for pressure loss before reopening', keywords: ['pressure', 'leak', 'check'] },
    ],
    sources: [ESA_DEBRIS, NASA_ISS],
  },
  // ── Spacecraft & Launch ───────────────────────────────────────────────────
  {
    track: 'spacecraft-launch',
    title: 'The Throttle Bucket',
    briefing:
      'T+52 seconds. Your rocket is supersonic and climbing. Guidance commands the first-stage engines down to 70 percent thrust, and a new controller on your team asks why anyone would give up thrust while still fighting gravity. In 20 seconds the engines will throttle back up. Explain to them what is happening to the vehicle right now, why the throttle-down exists, and what it costs.',
    correctAnswer:
      'The vehicle is approaching Max-Q, the point of maximum dynamic pressure, q = ½ρv². Air density is falling with altitude while velocity is rising fast, and their product peaks around one minute into flight. Dynamic pressure sets aerodynamic loads and heating on the structure, so the engines throttle down to keep q under the structural limit. Once past Max-Q the air is thin enough that the engines throttle back up. The cost is extra gravity loss: time spent at lower thrust is time the engines spend holding the rocket up instead of accelerating it, which costs some payload margin.',
    rubric: [
      { point: 'Names Max-Q / maximum dynamic pressure', keywords: ['max-q', 'max q', 'maxq', 'dynamic pressure'] },
      { point: 'Explains q depends on air density and velocity squared', keywords: ['density', 'velocity', 'speed', '½', '1/2', 'rho'] },
      { point: 'Links it to structural loads and heating', keywords: ['structur', 'load', 'stress', 'heating', 'aerodynamic'] },
      { point: 'Notes the engines throttle back up after Max-Q', keywords: ['throttle back up', 'throttle up', 'back up', 'after max'] },
      { point: 'Identifies the cost: gravity losses / payload margin', keywords: ['gravity loss', 'gravity drag', 'margin', 'payload', 'efficien'] },
    ],
    sources: [GRC_AERO, GRC_THRUST, ESA_LAUNCH],
  },
  {
    track: 'spacecraft-launch',
    title: 'Engine Out at T+90',
    briefing:
      'Ninety seconds into an uncrewed launch to a 550 km orbit, telemetry shows one of the nine first-stage engines has shut down after a turbopump vibration spike. The other eight are nominal. The payload is a commercial satellite. You are the launch director. What happens to the vehicle and the trajectory, and how do you decide whether the mission can still reach its target orbit?',
    correctAnswer:
      'First the failed engine must be safely isolated so it cannot damage its neighbours. The remaining eight engines burn longer, and guidance re-plans the trajectory in flight, steering to use the remaining performance. Whether the target is still reachable comes down to the rocket equation and propellant margin: the lost thrust means more gravity loss and a longer burn, so the team checks predicted delta-v against what is needed. If the margin covers it, the mission continues, possibly using reserves meant for booster recovery. If not, the payload goes to a lower orbit and raises itself, or the flight follows its abort rules.',
    rubric: [
      { point: 'Isolates the failed engine to protect neighbours', keywords: ['isolat', 'shut down', 'shutdown', 'contain', 'neighbo'] },
      { point: 'Remaining engines burn longer to compensate', keywords: ['burn longer', 'longer burn', 'remaining engines', 'eight engines', 'compensat'] },
      { point: 'Guidance re-plans the trajectory', keywords: ['guidance', 're-plan', 'replan', 'retarget', 'trajectory'] },
      { point: 'Checks delta-v / propellant margin', keywords: ['delta-v', 'delta v', 'margin', 'propellant', 'rocket equation', 'reserve'] },
      { point: 'Has a fallback: lower orbit or abort rules', keywords: ['lower orbit', 'abort', 'fallback', 'contingency'] },
    ],
    sources: [GRC_THRUST, ESA_LAUNCH],
  },
  // ── Orbits & Gravity ──────────────────────────────────────────────────────
  {
    track: 'orbits-gravity',
    title: 'Catch the Station',
    briefing:
      'Your capsule is in the same circular orbit as the space station but 40 km behind it. The rookie pilot reaches for the controls: "Easy, I\'ll fire the engines forward and close the gap." You have a few seconds before they burn. What will actually happen if they thrust prograde, and how should you catch the station instead?',
    correctAnswer:
      'Thrusting prograde raises the orbit. A higher orbit has a longer period and a slower average speed, so the capsule would drift further behind. To catch up you do the opposite: a retrograde burn drops you into a lower, faster orbit, you phase forward relative to the station over several orbits, and then you raise the orbit again with prograde burns timed so you arrive at the station\'s altitude near the station. This is orbital phasing, finished with a Hohmann-style transfer and a careful final approach.',
    rubric: [
      { point: 'Recognises prograde thrust raises the orbit', keywords: ['raise', 'higher orbit', 'climb'] },
      { point: 'Higher orbit means longer period / slower, so it falls behind', keywords: ['longer period', 'slower', 'fall behind', 'falls behind', 'drift back'] },
      { point: 'Burns retrograde to drop to a lower, faster orbit', keywords: ['retrograde', 'lower orbit', 'slow down', 'brake'] },
      { point: 'Uses orbital phasing over several orbits', keywords: ['phas', 'several orbits', 'catch up', 'over time'] },
      { point: 'Raises the orbit again to match the station', keywords: ['hohmann', 'raise again', 'match', 'rendezvous', 'circulari'] },
    ],
    sources: [JPL_ORBITS, JPL_BASICS],
  },
  {
    track: 'orbits-gravity',
    title: 'Reboost Before Solar Maximum',
    briefing:
      'The station has lost almost 2 km of altitude over the past month, faster than last year. The Sun is approaching solar maximum. A cargo ship docked at the aft port can fire its thrusters. You are planning the reboost. Why is the station sinking faster now, how will you raise it, and how many burns will you need?',
    correctAnswer:
      'The station orbits inside the thin upper atmosphere, so drag slowly removes energy and the orbit decays. Near solar maximum, extra ultraviolet heats and expands the upper atmosphere, raising the density at station altitude and increasing drag. To raise the orbit you burn prograde with the docked cargo ship\'s thrusters, timed and oriented through the station\'s centre of mass. A clean change between circular orbits is a Hohmann transfer: the first burn raises the opposite side of the orbit, and a second burn half an orbit later at the new high point circularizes it.',
    rubric: [
      { point: 'Identifies atmospheric drag as the cause of decay', keywords: ['drag', 'atmosphere', 'friction'] },
      { point: 'Links faster decay to solar activity heating/expanding the atmosphere', keywords: ['solar max', 'solar activity', 'sun', 'expand', 'heat'] },
      { point: 'Raises the orbit with a prograde burn', keywords: ['prograde', 'forward', 'direction of travel'] },
      { point: 'Uses two burns (Hohmann transfer)', keywords: ['two burn', 'hohmann', 'second burn', 'two impulse'] },
      { point: 'Circularizes at the new high point (apoapsis)', keywords: ['circulari', 'apoapsis', 'apogee', 'high point'] },
    ],
    sources: [JPL_BASICS, NASA_ISS],
  },
  // ── Black Holes & Stars ───────────────────────────────────────────────────
  {
    track: 'black-holes-stars',
    title: 'A Star Torn Apart',
    briefing:
      'An all-sky survey flags a galaxy 300 million light-years away whose nucleus has brightened a hundredfold in ultraviolet and X-rays over two weeks. Spectra show hot gas moving at thousands of kilometres per second. Your team suspects a star wandered too close to the galaxy\'s central supermassive black hole. You are writing the alert. Explain what physically happened to the star, why the flare is so bright, and what the light curve should do next.',
    correctAnswer:
      'This looks like a tidal disruption event. The black hole\'s gravity is much stronger on the near side of the star than the far side; inside the tidal radius that difference exceeds the star\'s own gravity and the star is stretched into a stream ("spaghettification"). Roughly half the debris is flung away and half falls back, forming a hot accretion disk that radiates intensely in X-rays, UV and optical light. The flare should fade over months, often roughly as t^(-5/3) as the fallback rate drops. For the most massive black holes the tidal radius lies inside the event horizon, so the star is swallowed whole with no flare.',
    rubric: [
      { point: 'Names a tidal disruption event', keywords: ['tidal disruption', 'tde'] },
      { point: 'Explains tidal forces stretching the star (spaghettification)', keywords: ['tidal force', 'stretch', 'spaghetti', 'difference in gravity', 'tidal radius'] },
      { point: 'Debris forms a hot accretion disk that radiates', keywords: ['accretion', 'disk', 'disc'] },
      { point: 'Predicts the flare fades over months', keywords: ['fade', 'decline', 'months', 't^-5/3', '5/3'] },
      { point: 'Notes very massive black holes swallow stars whole', keywords: ['swallow', 'event horizon', 'too massive', 'whole'] },
    ],
    sources: [NASA_BH, NASA_BH_TYPES],
  },
  {
    track: 'black-holes-stars',
    title: 'Betelgeuse Goes Dim',
    briefing:
      'Over three months the red supergiant Betelgeuse, normally one of the brightest stars in Orion, fades to less than half its usual brightness. Social media is full of posts saying it is about to explode. A journalist calls your observatory. What is Betelgeuse, what could cause the dimming, and what will eventually happen to it? Should anyone on Earth worry?',
    correctAnswer:
      'Betelgeuse is a red supergiant in a late stage of life, burning heavier elements in its core. Its brightness naturally varies because its huge, convective surface pulses, and observations of the 2019-2020 "Great Dimming" showed the dip was caused by a cooler surface patch and a cloud of dust the star ejected, not an imminent explosion. Eventually, when its core turns to iron and can no longer fuse, it will collapse and explode as a core-collapse supernova, probably within the next 100,000 years, leaving a neutron star or a black hole. At roughly 550 light-years away it is far too distant to harm Earth; it would simply be visible in daylight for weeks.',
    rubric: [
      { point: 'Identifies it as a red supergiant late in its life', keywords: ['red supergiant', 'supergiant', 'late stage', 'end of its life', 'massive star'] },
      { point: 'Attributes the dimming to dust and surface activity, not an explosion', keywords: ['dust', 'surface', 'convect', 'pulsat', 'cooler'] },
      { point: 'Predicts an eventual core-collapse supernova', keywords: ['supernova', 'core collapse', 'iron core'] },
      { point: 'Names the remnant: neutron star or black hole', keywords: ['neutron star', 'black hole'] },
      { point: 'Explains Earth is at a safe distance', keywords: ['safe', 'light-years', 'light years', 'too far', 'no danger'] },
    ],
    sources: [NASA_STARS, NASA_STAR_TYPES],
  },
  // ── Planets ───────────────────────────────────────────────────────────────
  {
    track: 'planets',
    title: 'The Storm That Ate the Sun',
    briefing:
      'Orbiters see a regional dust storm on Mars growing into a planet-encircling event. Your solar-powered rover sits in its path. Over three days the atmospheric opacity (tau) climbs from 1 to 6, and the morning power reading falls by more than half. It is late autumn at the rover\'s latitude. You lead the rover team. What do you change on the rover today, what is the biggest risk, and how will you know when it is safe to wake it?',
    correctAnswer:
      'High dust opacity blocks sunlight, so the solar arrays generate a fraction of normal power. The team cuts power use hard: stop driving and science, reduce communication sessions, and move to a minimal low-power or fault-protection state. The biggest risk is the cold: with too little energy the battery and electronics cannot be heated and may be damaged, and if power drops below a threshold the rover may lose its clock or brown out (Opportunity was lost this way in 2018). The team keeps heater budget as the priority, then runs a listening campaign, waiting for tau to fall and power to recover before slowly restarting operations.',
    rubric: [
      { point: 'Explains dust opacity cuts solar power', keywords: ['tau', 'opacity', 'sunlight', 'solar array', 'solar panel', 'less power'] },
      { point: 'Cuts power use: stop driving/science, low-power mode', keywords: ['low power', 'low-power', 'hibernat', 'sleep', 'stop driving', 'pause', 'suspend', 'minimal'] },
      { point: 'Prioritises heating the battery and electronics against cold', keywords: ['heat', 'warm', 'cold', 'temperature', 'battery'] },
      { point: 'Recognises the risk of brown-out / losing the rover (Opportunity)', keywords: ['brown', 'opportunity', 'lose the rover', 'clock', 'fault'] },
      { point: 'Plans a recovery / listening campaign as the storm clears', keywords: ['listen', 'recover', 'wait', 'clears', 'tau falls', 'wake'] },
    ],
    sources: [NASA_MARS, JPL_BASICS],
  },
  {
    track: 'planets',
    title: 'Descent to Titan',
    briefing:
      'Your lander will enter the atmosphere of Saturn\'s moon Titan. Surface pressure is about 1.5 times Earth\'s, gravity is about one-seventh of Earth\'s, and the surface sits near minus 179 °C under a thick orange haze. Sunlight at the surface is roughly one percent of what Earth gets. You are the mission architect. How should the lander get down, stay alive, and power itself?',
    correctAnswer:
      'Titan is unusually friendly to descent. After a heat shield handles atmospheric entry, the dense nitrogen atmosphere plus low gravity make parachutes very effective: the Huygens probe drifted down for over two hours in 2005. Low gravity and thick air even make powered flight easy, which is why Dragonfly is a rotorcraft. The cold is the main survival challenge, so the lander needs insulation and waste heat to keep electronics warm. Sunlight is far too dim for solar power, so a radioisotope power source (RTG/MMRTG) supplies both electricity and heat. Communication goes back to Earth with over an hour of light delay, directly or via a relay.',
    rubric: [
      { point: 'Uses a heat shield for entry', keywords: ['heat shield', 'aeroshell', 'entry'] },
      { point: 'Thick atmosphere and low gravity make parachutes/flight effective', keywords: ['parachute', 'thick atmosphere', 'dense', 'low gravity', 'rotorcraft', 'fly'] },
      { point: 'Protects against extreme cold with insulation/heat', keywords: ['cold', 'insulat', 'heater', 'warm', 'thermal'] },
      { point: 'Uses radioisotope power instead of solar', keywords: ['rtg', 'radioisotope', 'nuclear', 'plutonium', 'mmrtg'] },
      { point: 'Plans for long communication delays', keywords: ['delay', 'relay', 'communicat', 'light-time', 'light time'] },
    ],
    sources: [NASA_TITAN, JPL_BASICS],
  },
]

export function mockScenariosFor(track: TrackId): MockScenario[] {
  return MOCK_SCENARIOS.filter((s) => s.track === track)
}
