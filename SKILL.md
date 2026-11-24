---
name: pollen-mixtape
description: Turn one line of mood into an instrumental EP release — cover art, per-track music prompts, liner notes, and a playable release card (plus the rendered tracks when the user asks for audio). Use when someone asks for a mixtape, EP, soundtrack, or music to go with a picture or a vibe.
---

# Pollen Mixtape

Give it one line — *"rainy rooftop at 3am"* — and it returns a small, finished release:

```text
out/
  cover.png        cover art
  index.html       release card: cover + liner notes + per-track prompts
  release.json     title, liner note, per-track prompts
  track-1.mp3      instrumental loop (only with --music)
  track-2.mp3
  track-3.mp3
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
| `--tracks` | `3` | number of tracks (1-6) |
| `--duration` | `12` | seconds per loop, used when rendering audio |
| `--music` | off | paid music model to render the tracks with |
| `--seed` | random | same seed + same idea = same release |

Then open `out/index.html`.

## Free by default

A plain run stays on free models: text for the EP plan, image for the cover. **Every music model on
Pollinations is `paid_only`**, so audio is never generated unless the user asks for it:

```bash
node scripts/mixtape.mjs --idea "rainy rooftop at 3am" --music elevenlabs/music-v2.5
```

Say the cost out loud before adding that flag — a three-track, 12-second release costs roughly $0.10
in total, almost all of it audio.

## How it works

1. **Text** — one JSON-mode call writes the EP title, a liner note, and a music prompt per track.
2. **Image** — one call turns the idea into square cover art (`zimage`, $0.004 at the time of writing).
3. **Audio** — only with `--music`: one call per track, instrumental, `--duration` seconds.
4. **Release card** — `index.html` is written locally from those files. Nothing is uploaded and no
   URL is required, so the release keeps working offline.

## Notes for the agent

- Run the script, then **show the user `out/index.html`** (or the printed list of files). Do not
  describe the tracks instead of generating them.
- If the user wants to hear the tracks, run it again with `--music elevenlabs/music-v2.5` and tell them
  that step is paid before you spend their balance.
- Every file is written by polli's own `--output`, so failures leave no half-written audio.
- If `polli` is missing, install it first: `npm i -g @pollinations/cli`.
- The music prompt is generated, not sampled: nothing is copied from existing songs.
