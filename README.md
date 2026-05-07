# Personalized Mental Math Trainer

## Run

Open `index.html` directly in a browser. There is no build step, server, account, or cloud sync.

The app uses plain HTML, CSS, JavaScript modules, `localStorage`, and Chart.js from a CDN. The first chart load needs network access unless the CDN file is already cached.

## Daily Modes

Morning is the Standard Zetamac session: small addition, subtraction, multiplication, and integer division under a default 120-second timer.

Afternoon is the harder arithmetic block. It includes Bigger Numbers, Division Heavy, and Percentages sub-modes.

Evening is skill isolation for trader-style work. It includes fractions to decimals, percentage chains, log/exp approximations, signed arithmetic, probability arithmetic, squares and square roots, and compound mental math.

## Data

All data stays in this browser under the single `localStorage` key `mmt_data_v1`. Every round stores its summary plus every problem, answer, correctness flag, timing, drill type, and sub-type.

Use History -> Export JSON to back up your data. Use Import JSON to replace the current browser data with a previous export. Clear All Data asks twice before wiping.

If browser storage is blocked or corrupted, the app shows a warning and runs in memory only for the current page session.

## Weaknesses

Weaknesses groups attempts from the last 14 days by sub-type. A sub-type needs at least 10 attempts before it can appear. The score penalizes both slowness and inaccuracy, so the top cards are the best places to spend focused practice time.

Practice this starts a 60-second custom round using only that sub-type. Drill similar generates 10 sample problems from the same sub-type inline.

## Training Philosophy

The split is deliberate. Morning builds Zetamac speed. Afternoon pushes range and precision while the core arithmetic patterns are fresh. Evening isolates interview-specific conversions and approximations that normal arithmetic drills do not cover.

During an active round, switching to another app tab in this trainer aborts and saves the round as aborted. Aborted rounds appear in History when enabled but are excluded from Progress charts by default.
