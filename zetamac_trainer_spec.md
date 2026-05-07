# Personalized Mental Math Trainer — Build Spec

## Project Overview

Build a single-user, local-only mental math training web app for someone preparing for quantitative trading interviews (Optiver-style mental math). The app must replicate Zetamac's core "answer as many as you can in 2 minutes" loop, then extend it with additional drill types and analytics.

The user practices in three sessions per day: morning (standard arithmetic), afternoon (extended/larger numbers), and evening (trader-specific drills like fractions-to-decimals, percentages, log/exp approximations). The app must support all three modes, log every problem and answer, and surface weaknesses over time.

**End goal of the user**: maximize speed and accuracy on Optiver-style mental math under time pressure. The app's analytics should help identify which problem types are slow or error-prone so practice can be targeted.

---

## Tech Stack & Constraints

- **Pure HTML / CSS / JavaScript**. No build tools, no framework, no server.
- **Single folder, runs locally** by opening `index.html` in a browser. No hosting.
- **Persistence: `localStorage`** only. All data stays on the user's machine.
- **External libraries via CDN** are acceptable (Chart.js is the only one needed). The app must function offline once the page is loaded with the CDN cached, but a network connection is acceptable for first load.
- **No `<form>` tags requiring submission**. Use input event handlers only.
- **Responsive layout** but desktop-first — the user will run this on a laptop.
- **Keyboard-first UX**. The user should never need to touch the mouse during a drill round. Enter submits, focus stays on input.

---

## File Structure

```
mental-math-trainer/
├── index.html          # main shell, all tabs
├── styles.css          # all styling
├── js/
│   ├── app.js          # main controller, tab routing, state
│   ├── problems.js     # problem generators for every drill type
│   ├── drill.js        # drill loop (timer, scoring, input handling)
│   ├── storage.js      # localStorage wrapper, schema migrations
│   ├── analytics.js    # aggregations for viz + weaknesses
│   ├── viz.js          # Chart.js rendering
│   └── weaknesses.js   # weakness-detection logic + UI
└── README.md           # how to run + what each mode does
```

Keep files focused. `problems.js` should export one function per drill type so they're independently testable.

---

## Top-Level UI

Single-page app with four tabs in a sticky top nav:

1. **Train** — pick a mode and start a drill round
2. **History** — table of all past rounds with filters
3. **Progress** — charts over time (Chart.js)
4. **Weaknesses** — surfaced weak spots with drill-down

Active tab indicated visually. Tab switch should be instant (no reload). Use a hash-based router (`#train`, `#history`, etc.) or simple tab state in `app.js`.

### Visual Design

- Dark theme by default. High contrast — this is a focus tool, not a marketing page.
- Monospaced font for problems and answers. Sans-serif elsewhere.
- Large problem text during drills (3rem+).
- Minimal chrome during a drill — when a round is active, the top nav can dim or shrink.
- Color coding for correctness: green flash on correct, red flash on incorrect, both subtle (~150ms).

---

## Training Modes (Detailed)

Each mode is a configurable preset that selects which problem generators to draw from and with what weights. The user picks a mode, optionally tweaks the round length (default 120s), then hits start.

### Morning Mode — "Standard Zetamac"

Replicates default Zetamac configuration exactly.

- **Addition**: `a + b` where `a, b ∈ [2, 100]`
- **Subtraction**: inverse of addition — given `a + b = c`, present `c - a` so result is in `[2, 100]`
- **Multiplication**: `a × b` where `a ∈ [2, 12]`, `b ∈ [2, 100]`
- **Division**: inverse of multiplication — given `a × b = c`, present `c / a` so result is integer in `[2, 100]`
- All four operation types equally weighted by default
- Round length: 120 seconds
- All answers are integers

### Afternoon Mode — "Extended Zetamac"

Larger numbers and harder operations. Should feel like a step up from morning, not a different sport.

User picks one of three sub-configs at the start of the round:

**Sub-config A: Bigger Numbers**
- Addition: `a, b ∈ [10, 999]`
- Subtraction: result ∈ `[10, 999]`
- Multiplication: `a ∈ [11, 25]`, `b ∈ [11, 99]`
- Division: integer-result division with dividends up to 9999

**Sub-config B: Division-Heavy**
- 70% division, 30% mixed
- Division to 3 decimal places (e.g., `47 / 13 = 3.615`). Round half-to-even.
- Acceptable answer tolerance: ±0.001 (last digit can be off by one)

**Sub-config C: Percentages**
- 100% percentage problems
- Forms:
  - `X% of Y` where `X ∈ [1, 99]`, `Y` is a multiple of 100 ranging up to 10000
  - `X% of Y` where `X ∈ [1, 50]`, `Y` is any integer in `[100, 9999]` (harder)
  - Reverse: `What % is A of B?`
- Answers to nearest integer or 1 decimal depending on problem
- Tolerance: ±0.5 for percentage answers, ±5 for "X% of Y" integer answers when answer > 100

Round length: 120 seconds.

### Evening Mode — "Trader Drills"

Designed for drills Zetamac doesn't cover. User picks one drill type per round (no mixing — these are skill-isolation drills).

**Drill 1: Fractions to Decimals**
- Generate `p / q` where `p ∈ [1, 30]`, `q ∈ [7, 23]`, `gcd(p, q) = 1` (no trivial reductions)
- Answer to 4 decimal places
- Tolerance: ±0.0005
- Reinforces 1/7, 1/11, 1/13, 1/17, 1/19, 1/23 patterns

**Drill 2: Percentage Chains**
- Two-step: "X% of Y, then Z% of result"
- Example: "12% of 850, then 75% of that"
- Three-step variant for harder rounds
- Tolerance: ±1 for absolute, ±0.5% relative

**Drill 3: Log/Exp Approximations**
- Log values: `ln(x)` where `x ∈ {1.1, 1.2, ..., 5.0}` step 0.1, plus `ln(10), ln(2), ln(e), ln(100)` etc.
- Exp values: `e^x` where `x ∈ [-2, 3]` step 0.25
- Answer to 2 decimal places
- Tolerance: ±0.05
- Show a small reference card on first launch: `ln(2)≈0.693, ln(3)≈1.099, ln(10)≈2.303, e≈2.718, e²≈7.389`. Reference is hideable.

**Drill 4: Negative Numbers**
- Arithmetic involving negatives: `-47 + 89`, `-23 × -7`, `-156 / 12`
- Mix of all four operations
- Force user to track signs

**Drill 5: Probability Arithmetic**
- Combining independent probabilities: "P(A) = 0.3, P(B) = 0.4, P(A and B)?"
- Complement: "P(at least one of three independent events with p=0.2)?"
- Conditional: simple Bayes setups
- Odds-to-probability conversions: "3:1 odds → probability?"
- Answer to 3 decimal places
- Tolerance: ±0.005

**Drill 6: Squares and Square Roots**
- Squares of integers `[11, 99]`
- Approximate square roots of integers `[2, 200]` to 2 decimals
- Tolerance: ±0.05 for roots, exact for squares

**Drill 7: Compound Mental Math (capstone)**
- Multi-step: "What's 17% of (84 × 12)?"
- "Average of 47, 83, 91, 56?"
- "If price goes from 84 to 91, what % change?"
- Mix of all skills above. Use sparingly — these take longer per problem.

Round length: configurable, default 180 seconds for trader drills (problems are slower).

---

## Problem Generation Requirements

Each generator must return:

```js
{
  problemId: string,        // unique per problem instance
  drillType: string,        // 'standard_mult', 'fraction_to_decimal', etc.
  subType: string | null,   // e.g. 'mult_2digit_2digit' for finer-grained tagging
  problemText: string,      // displayed to user
  correctAnswer: number,
  tolerance: number,        // absolute tolerance for "correct"
  difficulty: number        // 1-5, used for analytics weighting
}
```

The `subType` field is critical for the Weaknesses tab — that's how the app identifies "you're slow on division when divisor is 7-9" vs. just "you're slow on division generally."

Suggested subType taxonomy (extend as needed):

- `add_small` (both operands < 50), `add_large` (one or both ≥ 50)
- `sub_small`, `sub_large`
- `mult_table` (one operand ≤ 12), `mult_2x2`, `mult_2x3`
- `div_clean` (one-digit divisor), `div_hard` (divisor 7-13), `div_decimal`
- `pct_clean` (round numbers), `pct_messy`
- `frac_low_denom` (q ≤ 11), `frac_high_denom` (q ≥ 13)
- `log_small_x` (x < 2), `log_large_x` (x ≥ 2)
- ...etc.

Generators should never produce duplicates within a single round. Maintain a `seenInRound` set.

---

## Drill Loop

When the user starts a round:

1. Display 3-2-1 countdown (1 second each), then start
2. Show the problem in large type, focus on input field
3. Start the round timer (visible, counting down)
4. On Enter:
   - Compare input to `correctAnswer` within `tolerance`
   - Flash green/red briefly
   - Log the attempt with timing (ms since problem appeared)
   - Generate next problem, clear input, refocus
5. When timer hits 0:
   - Lock input
   - Show round summary: total attempted, correct, accuracy %, problems/min, slowest 3 problems, fastest 3 problems
   - "Save & Exit" button (auto-saves on round end actually; this just navigates away)
   - "Start Another Round" button

The user can also press Escape to abort a round mid-way. Aborted rounds are saved with a flag but excluded from progress charts by default.

---

## Data Schema (localStorage)

Single key: `mmt_data_v1`. Value is a JSON object:

```json
{
  "schemaVersion": 1,
  "rounds": [
    {
      "roundId": "uuid",
      "startedAt": "2026-05-01T08:32:14.000Z",
      "endedAt": "2026-05-01T08:34:14.000Z",
      "mode": "morning" | "afternoon" | "evening",
      "subMode": "standard" | "bigger_numbers" | "division_heavy" | "percentages" | "fraction_to_decimal" | "...",
      "durationSec": 120,
      "aborted": false,
      "summary": {
        "attempted": 47,
        "correct": 43,
        "accuracy": 0.915,
        "problemsPerMin": 23.5,
        "avgTimeMs": 2553
      },
      "attempts": [
        {
          "problemId": "...",
          "drillType": "standard_mult",
          "subType": "mult_2x2",
          "problemText": "47 × 23",
          "correctAnswer": 1081,
          "userAnswer": 1081,
          "correct": true,
          "timeMs": 4210,
          "tolerance": 0
        }
      ]
    }
  ],
  "settings": {
    "theme": "dark",
    "defaultRoundSec": 120,
    "showLogReference": true
  }
}
```

`storage.js` exposes:
- `getData()` — returns parsed object, initializes if missing
- `saveRound(round)` — appends to `rounds`, writes back
- `updateSettings(partial)` — merge into settings
- `exportData()` — returns JSON string for download backup
- `importData(json)` — replaces current data after confirmation
- `clearAllData()` — confirms twice, wipes

Add Export/Import buttons in a small "Settings" footer or under the History tab. The user should be able to back up to a file periodically.

---

## History Tab

Table of all rounds, newest first. Columns:

- Date/time
- Mode (color coded: morning = warm, afternoon = mid, evening = cool)
- Sub-mode
- Duration
- Attempted / Correct / Accuracy
- Problems per minute
- Actions: "View detail" (expand row to show all attempts), "Delete"

Filters above the table:
- Date range (default: last 30 days)
- Mode (all / morning / afternoon / evening)
- Sub-mode (depends on mode selection)
- Show aborted rounds (toggle, default off)

---

## Progress Tab (Visualization)

Use **Chart.js via CDN**. Single page, multiple charts stacked vertically.

**Chart 1: Daily Volume**
- Bar chart, x-axis = date (last 30 days default, configurable to 7/30/90/all)
- y-axis = total problems attempted that day
- Stacked by mode (morning/afternoon/evening)

**Chart 2: Speed Over Time (Problems Per Minute)**
- Line chart, one line per mode
- x-axis = date, y-axis = avg problems/min for that day
- 7-day rolling average overlay (lighter, dashed)

**Chart 3: Accuracy Over Time**
- Line chart, one line per mode
- y-axis: accuracy % (zoom in to 70-100% range; below 70% means user is making careless errors)
- 7-day rolling average overlay

**Chart 4: Speed by Sub-Type**
- Horizontal bar chart
- Each bar = one subType (e.g., `mult_2x2`, `div_hard`, `frac_high_denom`)
- Bar value = avg time per problem (ms), last 14 days
- Color: green if better than user's overall average, red if worse
- Sort: slowest at top

**Chart 5: Personal Bests**
- Small KPI cards at top of tab, not a chart per se:
  - Best score (correct count) per mode, all-time
  - Best accuracy, all-time
  - Highest problems/min, all-time
  - Current streak (consecutive days with at least one round)
  - Total problems attempted lifetime

Date range selector at top of Progress tab affects all time-series charts.

---

## Weaknesses Tab

This is the highest-value tab. The point: tell the user what to work on.

### Top Section: "Your 5 Weakest Areas"

Algorithm:
1. Aggregate all attempts in the last 14 days, group by `subType`
2. For each subType with ≥ 10 attempts, compute:
   - `avgTimeMs`
   - `accuracy`
   - `weakness_score = (avgTimeMs / overall_avg_timeMs) × (1 - accuracy + 0.5)` — both slow and inaccurate raises the score
3. Display top 5 highest weakness_score subTypes as cards

Each card shows:
- SubType name (human-readable: "Division with 7-9 divisors" not `div_hard`)
- Sample size (n attempts)
- Avg time vs. overall (e.g., "3.4s vs 2.1s avg — 62% slower")
- Accuracy (e.g., "82% — you usually hit 94%")
- "Practice this" button → starts a custom round drilling only this subType for 60 seconds

### Middle Section: "Specific Problems You Got Wrong"

Table of the last 50 incorrectly-answered problems:
- Problem text
- Your answer
- Correct answer
- Date
- "Drill similar" button (generates 10 problems of same subType inline)

### Bottom Section: "Improvement Tracker"

For each subType, show:
- Trend arrow (improving / stable / declining over last 30 days)
- Sparkline of accuracy
- Sparkline of speed

Sortable by most-improved, most-declined, or alphabetical.

### Custom Practice Rounds

The "Practice this" button mentioned above should generate a focused round:
- Round length: 60 seconds (shorter, intense)
- Only problems from the targeted subType
- After the round, return to Weaknesses tab and re-render with new data

---

## Performance & UX Polish

- Problem generation must be fast (<1ms per problem) — never block the UI
- Input field must accept negative numbers and decimals
- Allow `.5` (no leading zero) and `-.5` as valid input
- Strip whitespace before parsing
- Show the user a small "tolerance hint" for drills with non-integer answers (e.g., "answer to 3 decimal places")
- During a round, show a small running counter: "23 correct / 24 attempted" in a corner
- After a round, show a 1-line motivational summary based on personal-best comparison: "New PB on accuracy!" or "Off your best speed by 8%"

---

## Edge Cases & Validation

- If `localStorage` is unavailable (private mode, corrupted), show a warning banner and run in-memory only with a note that data won't persist
- If the user starts a drill, switches tabs mid-round, the timer pauses (or aborts — pick one and document)
- If localStorage exceeds ~4MB, prompt the user to export/clear oldest rounds
- Handle floating-point comparison correctly with the `tolerance` field; never use `===` for non-integer answers
- Generators must not produce problems with answer 0 unless intentional (e.g., for negative-number drills)
- Division generators must not produce trivial problems (e.g., `100 / 1`)
- Validate user input before parsing — empty Enter does nothing, doesn't count as wrong

---

## README Contents

The agent should also generate a `README.md` covering:
- How to run (just open `index.html`)
- The three daily modes and what each is for
- How data is stored and how to back it up
- How to interpret the Weaknesses tab
- A brief "training philosophy" section explaining the morning/afternoon/evening split

---

## Out of Scope (Don't Build)

- User accounts, authentication, multi-user support
- Cloud sync
- Mobile-optimized UI (desktop is fine)
- Audio cues
- Leaderboards or social features
- Difficulty auto-adjustment / adaptive learning (the user wants raw drills, not a tutor)
- Spaced repetition of specific problems

---

## Acceptance Checklist

The agent should self-verify before finishing:

- [ ] Opens locally by double-clicking `index.html`, no server needed
- [ ] All four tabs render and switch instantly
- [ ] All three modes runnable end-to-end with at least one sub-mode each
- [ ] All seven evening drill types generate valid problems
- [ ] Round saves to localStorage and appears in History tab immediately
- [ ] Progress tab renders all five chart sections with sample data
- [ ] Weaknesses tab surfaces at least one subType correctly given enough attempts
- [ ] Export/Import roundtrip preserves data exactly
- [ ] Keyboard-only operation: full drill round completable without mouse
- [ ] No console errors during normal use
