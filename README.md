# Pollen Mixtape

One line of mood in, a finished instrumental EP out: cover art, three looping tracks, liner notes and
a release card you can open and play — all generated through the [Pollinations](https://pollinations.ai)
models with the [polli CLI](https://www.npmjs.com/package/@pollinations/cli).

This repository is an **agent skill** in the [Agent Skills](https://agentskills.io/) format. Point a
coding agent at it and it knows how to make a mixtape; there is no API key to handle because the CLI
signs the agent in.

```bash
npm i -g @pollinations/cli
polli auth login

git clone https://github.com/rekty/pollen-mixtape
cd pollen-mixtape
node scripts/mixtape.mjs --idea "rainy rooftop at 3am, neon reflections in puddles"
open out/index.html
```

![Pollen Mixtape release card](assets/screenshot.png)

## What it makes

```
out/
  cover.png       1024x1024 cover art
  track-1.mp3     instrumental loop
  track-2.mp3
  track-3.mp3
  release.json    title, liner note, the prompt used per track
  index.html      release card: cover, players, liner notes
```

The card is a plain local file: no hosting, no uploads, plays offline.

## Flags

| flag | default | meaning |
|---|---|---|
| `--idea` | required | the mood, scene or one-liner |
| `--out` | `./out` | output directory |
| `--tracks` | `3` | 1–6 tracks |
| `--duration` | `12` | seconds per loop |
| `--seed` | random | same idea + same seed = same cover and titles |

## Models

| step | model | note |
|---|---|---|
| text | Pollinations default text model, JSON mode | EP title, liner note, one music prompt per track |
| image | `zimage` (`tongyi-mai/z-image-turbo`) | $0.004 per cover |
| audio | `elevenlabs/music-v2.5`, instrumental | the bulk of the cost |

The example release in `examples/rainy-rooftop` cost about $0.10 in total. Try it cheaply with
`--tracks 1 --duration 8`.

## Notes

- Audio is generated from prompts only; nothing is sampled from existing recordings.
- `elevenlabs/music-v2.5` refuses a seed together with a prompt, so tracks are unseeded on purpose.
- Every file is written by polli's own `--output`, so a failed call leaves no half-written audio.

## Skill file

`SKILL.md` is the part the agent reads: when to use the skill, how to run it, and what to do with the
result. Keep the two in sync when changing the script.

---

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)
