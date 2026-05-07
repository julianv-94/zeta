# Setup

This is a static site. It runs locally by opening `index.html`, and it can be hosted on GitHub Pages.

Cross-device data sync is optional and uses your own GitHub repository as the database. A JSON file (`data/rounds.json` by default) holds all rounds. Each device pulls on load and pushes after every round.

## 1. Hosting on GitHub Pages

Public repo, free plan:

1. Push this code to your `main` branch.
2. Repo → Settings → Pages.
3. Source: **Deploy from a branch**. Branch: `main`. Folder: `/ (root)`. Save.
4. Wait ~30s. Your site is at `https://<your-user>.github.io/<repo>/`.

Private repo: GitHub Pages on private repos needs Pro/Team/Enterprise. If you stay on free, either make the repo public or deploy elsewhere:

- **Netlify** — connect the GitHub repo (private is fine on free plan), build command empty, publish dir `.`.
- **Vercel** — same idea, framework preset "Other".
- **Cloudflare Pages** — same idea.

The site is fully static so any of these work without configuration.

## 2. Creating the GitHub PAT

You need a fine-grained Personal Access Token scoped to just this one repo so the app can read/write `data/rounds.json`.

1. Go to https://github.com/settings/personal-access-tokens/new
2. **Token name**: `zeta-sync`.
3. **Expiration**: pick something long (1 year). When it expires, generate a new one and paste it again.
4. **Repository access**: *Only select repositories* → choose `julianv-94/zeta`.
5. **Repository permissions** → set:
   - **Contents**: Read and write
   - (everything else: leave as No access)
6. Generate token. Copy it — you can't see it again.

## 3. Wiring sync in the app

1. Open the site.
2. On the Train tab, scroll to **Cloud sync (GitHub)**.
3. Fill in:
   - Repo: `julianv-94/zeta`
   - Branch: `main`
   - Path: `data/rounds.json`
   - GitHub PAT: paste the token
4. Check **Enable sync**.
5. Click **Save**. The app will attempt an initial pull.
6. Click **Push now** to create the file on the first device.

On any other device, repeat steps 1–5 with the same PAT (or generate a separate PAT per device, all scoped to the same repo).

## 4. How sync works

- On app load: pulls remote, merges by `roundId` (remote + local union).
- After each completed round: pushes the merged set with the latest SHA.
- `Pull now` / `Push now` buttons let you force either direction.
- The PAT is stored in this browser's `localStorage` only. It is never committed to the repo.
- If two devices push at the same time, the later one will get a 409 / SHA mismatch. Click **Pull now** then **Push now** to resolve.

## 5. Local-only mode

If sync is disabled or no PAT is set, the app works exactly as before — data lives in `localStorage` for the current browser. Use the History tab's Export/Import to move data manually.

## 6. New gameplay settings

On the Train tab:

- **Auto-advance on correct (block Enter on wrong)** — typing the correct answer advances immediately. Pressing Enter on a wrong answer does nothing (just flashes red). Standard Zetamac feel.
- **Show answer in bottom-right corner** — small faint number in the corner during a round. For practice / learning sessions.

Both are toggles; flip them per session as needed.
