# MDV Critical Path Diff

A Next.js app for comparing menswear critical path snapshots. Anyone with the team password can
drop in a CP file and get a change log against the team's shared baseline. The baseline
auto-updates to whichever file was last uploaded.

## How it works

- The "baseline" is a single Vercel Blob stored at the key `baseline-menswear.xlsx`.
- Users sign in with a single shared team password (no individual accounts).
- Files are processed in the browser using SheetJS — no large file uploads to the server.
- Output is a styled XLSX matching the format Naomi has been using.

## Deployment (the short version)

1. **GitHub**: push this folder to a new GitHub repo (use GitHub Desktop if easier).
2. **Vercel**: Import the repo. Use default Next.js settings. Don't click Deploy yet.
3. **Vercel → Storage → Create Blob store** (free tier). This auto-adds `BLOB_READ_WRITE_TOKEN`.
4. **Set environment variables** in Vercel → Settings → Environment Variables:

| Variable                | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `APP_PASSWORD`          | A password you choose for the team (anything you like)           |
| `AUTH_SECRET`           | Any long random string (run `openssl rand -base64 32` or invent one) |
| `BLOB_READ_WRITE_TOKEN` | Auto-set by Vercel when you created the Blob store               |

5. **Deploy**. Share the URL + password with your team.

## How the team uses it

1. Visit the app URL → enter the password → in.
2. First time only: drop in a CP file → it becomes the baseline.
3. Every time after: drop in this week's CP → click Compare → get the change log → file becomes the new baseline.

## Behavior notes

- **Big files are slow.** A 150 MB CP file takes ~2 minutes to process in the browser.
- **Whoever uploads last wins the baseline.** Pick a team convention (e.g. "Naomi runs the Monday refresh").
- **Re-running with the same file produces an empty change log** — comparing baseline against itself shows zero changes.
- **The baseline Blob URL is public-by-obscurity.** Anyone with the URL can download but the URL is unguessable. Fine for a small team; upgrade later if needed.

## Changing the password

Edit `APP_PASSWORD` in Vercel → Settings → Environment Variables → redeploy.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## What's not included

- Womenswear — currently menswear only. Adding it later means a category toggle.
- History — past comparisons aren't saved.
- Scheduled snapshots.
- SKU rename detection (the `MAN3508` → `MAN3508-05` colourway-suffix pattern).

- 
