# What's In the Box?

A multi-phase game-show web app (Next.js + React). Three phases per round: Closest-To trivia, a Sort-List / Media Trivia challenge, then a 60-door grid of prizes and chaos.

## Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 (or 3001 if 3000 is taken).

## Deploy (share with anyone, anywhere)

### Vercel — recommended

1. Push this repo to GitHub.
2. Go to https://vercel.com, sign in with GitHub, click **Import Project**, pick this repo, click **Deploy**.
3. You get a permanent URL like `your-repo.vercel.app`. Anyone with the link can play.

Every `git push` to `main` auto-redeploys.

## Carrying your questions between devices

`localStorage` is per-browser, so your rounds live on the device that created them. The app has a **📦 Presets** panel (Settings → Rounds → Presets) to move them between machines:

- **⬇ Export to File** — downloads a JSON of all your rounds (including uploaded images).
- **⬆ Import from File** — loads that JSON on any device.
- **💾 Save Current** — named snapshot saved in this browser.

So the typical flow is: author on your main machine → Export → open the live URL on any other device → Import.
