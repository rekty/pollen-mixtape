---
name: pollen-mixtape
description: Turn one line of mood into a finished instrumental EP — cover art, three looping instrumental tracks, liner notes, and a playable release card. Use when someone asks for a mixtape, EP, soundtrack, or music to go with a picture or a vibe.
---

# Pollen Mixtape

Give it one line — *"rainy rooftop at 3am"* — and it returns a small, finished release:

```
out/
  cover.png        cover art
  track-1.mp3      instrumental loop
  track-2.mp3
  track-3.mp3
  release.json     title, liner note, per-track prompts
  index.html       release card: cover + players + liner notes
```

Every step goes through the [polli CLI](https://www.npmjs.com/package/@pollinations/cli), so the skill
works in an agent session that has **no API key in the environment**. If a key is present, polli uses
it; if the user signed in with `polli auth login`, it spends their own balance.

## Run it

```bash
polli auth login                       # once per machine, no key handling
node scripts/mixtape.mjs --idea "rainy rooftop at 3am"
```

Options:

| flag | default | meaning |
|---|---|---|
| `--idea` | required | the mood, scene or one-liner |
| `--out` | `./out` | output directory |
| `--tracks` | `3` | number of instrumental tracks (1-6) |
| `--duration` | `12` | seconds per loop |
| `--seed` | random | same seed + same idea = same release |

Then open `out/index.html`.

## How it works

1. **Text** — one JSON-mode call writes the EP title, a liner note, and a music prompt per track.
2. **Image** — one call turns the idea into square cover art (`zimage`, $0.004 at the time of writing).
3. **Audio** — one call per track, `elevenlabs/music-v2.5`, instrumental, `--duration` seconds.
4. **Release card** — `index.html` is written locally from those files. Nothing is uploaded and no
   URL is required, so the release keeps working offline.

Cost is dominated by the audio calls; `--tracks 1 --duration 8` is the cheap way to try it.

## Notes for the agent

- Run the script, then **show the user `out/index.html`** (or the printed list of files). Do not
  describe the tracks instead of generating them.
- Every file is written by polli's own `--output`, so failures leave no half-written audio.
- If `polli` is missing, install it first: `npm i -g @pollinations/cli`.
- The music prompt is generated, not sampled: nothing is copied from existing songs.
