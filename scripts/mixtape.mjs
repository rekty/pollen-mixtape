#!/usr/bin/env node
// Pollen Mixtape — one line in, a finished instrumental EP out.
// Every generation goes through the polli CLI, so no API key is handled here.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// music is null by default: every music model on Pollinations is paid-only, so
// audio is opt-in and a plain run stays on free models (text + image).
const DEFAULTS = { out: "out", tracks: 3, duration: 12, music: null };

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument: ${a}`);
    const key = a.slice(2);
    if (!(key in opts) && key !== "idea" && key !== "seed") {
      throw new Error(`unknown flag: ${a}`);
    }
    const value = argv[++i];
    if (value === undefined) throw new Error(`missing value for ${a}`);
    opts[key] = key === "tracks" || key === "duration" || key === "seed" ? Number(value) : value;
  }
  if (!opts.idea) throw new Error('usage: node scripts/mixtape.mjs --idea "rainy rooftop at 3am"');
  if (!Number.isInteger(opts.tracks) || opts.tracks < 1 || opts.tracks > 6) {
    throw new Error("--tracks must be 1..6");
  }
  return opts;
}

// Windows needs a shell for the polli .cmd shim; double quotes are stripped from
// arguments so a prompt can never break out of the quoted command.
function quote(s) {
  // Newlines would split the command on Windows, so prompts are collapsed to one line.
  return `"${String(s).replace(/\s+/g, " ").replace(/"/g, "")}"`;
}

function polli(argv) {
  const cmd = ["polli", ...argv.map(quote)].join(" ");
  // input:"" closes stdin so polli does not sit waiting for piped text.
  const res = spawnSync(cmd, { shell: true, encoding: "utf8", input: "", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || "").trim().slice(-400);
    throw new Error(`polli ${argv.slice(0, 2).join(" ")} failed (${res.status}): ${detail}`);
  }
  return (res.stdout || "").trim();
}

const SYSTEM =
  "You are the art director of a small independent record label. You answer with one JSON object and nothing else.";

function planRelease(idea, tracks, seed) {
  const prompt = [
    `Release idea: ${idea}`,
    `Design a ${tracks}-track instrumental EP around it.`,
    "Return JSON with exactly these keys:",
    '{"title": "EP title, 2-4 words", "liner": "liner note, max 240 characters, no quotes", "tracks": [{"title": "track title", "mood": "a music-generation prompt under 80 characters describing instrumentation, tempo and texture, instrumental only"}]}',
    `Include exactly ${tracks} tracks.`,
    "Every track object must contain exactly two keys: title and mood. mood is the music prompt, not a duration or a number.",
  ].join("\n");
  const argv = ["gen", "text", "--json-response", "--system", SYSTEM];
  if (seed !== undefined) argv.push("--seed", String(seed));
  argv.push(prompt);
  const raw = polli(argv);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`model did not return JSON:\n${raw.slice(0, 400)}`);
  const plan = JSON.parse(raw.slice(start, end + 1));
  if (!plan.title || !Array.isArray(plan.tracks) || plan.tracks.length === 0) {
    throw new Error("model returned an incomplete release plan");
  }
  plan.tracks = plan.tracks.slice(0, tracks).map((track, i) => ({
    title: String(track.title || `Track ${i + 1}`),
    // Models like to answer with a length instead of a music prompt; derive one rather than fail.
    mood: String(track.mood || `${track.title || `Track ${i + 1}`} — ${idea}, instrumental`),
  }));
  return plan;
}

function coverArt(outDir, idea, title, seed) {
  const prompt = `Square album cover art for an instrumental EP called "${title}". Concept: ${idea}. Painterly, high contrast, no text, no letters, no watermark.`;
  const argv = ["gen", "image", "--width", "1024", "--height", "1024"];
  if (seed !== undefined) argv.push("--seed", String(seed));
  argv.push("--output", join(outDir, "cover.png"), prompt);
  polli(argv);
  return "cover.png";
}

// elevenlabs/music-v2.5 rejects a seed together with a prompt, so audio is not seeded.
function trackAudio(outDir, index, mood, duration, model) {
  const file = `track-${index + 1}.mp3`;
  const argv = [
    "gen",
    "audio",
    "--model",
    model,
    "--instrumental",
    "--duration",
    String(duration),
  ];
  argv.push("--output", join(outDir, file), `${mood}. Instrumental, no vocals, loops cleanly.`);
  polli(argv);
  return file;
}

function releaseCard(outDir, plan, cover, audio, idea, hint) {
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const rows = plan.tracks
    .map(
      (t, i) => `      <li>
        <div class="track-head"><span class="num">${String(i + 1).padStart(2, "0")}</span><h2>${esc(t.title)}</h2></div>
        <p class="mood">${esc(t.mood)}</p>${
          audio[i] ? `\n        <audio controls preload="none" src="${esc(audio[i])}"></audio>` : ""
        }
      </li>`,
    )
    .join("\n");
  const hintBlock = hint ? `\n      <p class="hint">${esc(hint)}</p>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(plan.title)} — ${esc(idea)}</title>
<style>
  :root { color-scheme: dark; --ink:#f4f1ea; --dim:#a9a294; --line:rgba(244,241,234,.14); --bg:#15140f; }
  * { box-sizing:border-box; }
  body { margin:0; background:radial-gradient(120% 80% at 80% -10%, #2b2115 0%, var(--bg) 55%) fixed, var(--bg);
         color:var(--ink); font:16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width:960px; margin:0 auto; padding:56px 24px 80px; }
  header { display:grid; grid-template-columns:minmax(0,320px) minmax(0,1fr); gap:32px; align-items:end; }
  @media (max-width:720px){ header{ grid-template-columns:1fr; align-items:start; } }
  .cover { width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px; border:1px solid var(--line);
           box-shadow:0 24px 60px -24px rgba(0,0,0,.9); }
  .kicker { text-transform:uppercase; letter-spacing:.18em; font-size:11px; color:var(--dim); margin:0 0 10px; }
  h1 { font:600 clamp(30px,6vw,54px)/1.02 "Iowan Old Style", Georgia, serif; margin:0 0 14px; letter-spacing:-.02em; }
  .liner { color:var(--dim); margin:0; max-width:46ch; }
  ol { list-style:none; margin:48px 0 0; padding:0; border-top:1px solid var(--line); }
  li { padding:20px 0; border-bottom:1px solid var(--line); }
  .track-head { display:flex; align-items:baseline; gap:14px; }
  .num { font-variant-numeric:tabular-nums; color:var(--dim); font-size:13px; }
  h2 { font-size:19px; margin:0; font-weight:600; }
  .mood { color:var(--dim); font-size:14px; margin:4px 0 10px; }
  .hint { color:var(--dim); font-size:13px; margin:18px 0 0; padding:10px 12px; border:1px solid var(--line);
          border-radius:4px; background:rgba(244,241,234,.04); }
  audio { width:100%; height:36px; }
  footer { margin-top:36px; color:var(--dim); font-size:12px; }
</style>
</head>
<body>
<main>
  <header>
    <img class="cover" src="${esc(cover)}" alt="Cover art for ${esc(plan.title)}">
    <div>
      <p class="kicker">Instrumental EP · Pollen Mixtape</p>
      <h1>${esc(plan.title)}</h1>
      <p class="liner">${esc(plan.liner || idea)}</p>${hintBlock}
    </div>
  </header>
  <ol>
${rows}
  </ol>
  <footer>Made with pollinations.ai · idea: ${esc(idea)}</footer>
</main>
</body>
</html>
`;
  writeFileSync(join(outDir, "index.html"), html);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = resolve(opts.out);
  mkdirSync(outDir, { recursive: true });

  process.stderr.write(`Planning "${opts.idea}"...\n`);
  const plan = planRelease(opts.idea, opts.tracks, opts.seed);

  process.stderr.write(`  ${plan.title} — ${plan.tracks.length} tracks\n`);
  const cover = coverArt(outDir, opts.idea, plan.title, opts.seed);
  process.stderr.write(`  cover: ${cover}\n`);

  // Without --music nothing paid runs: the card lists the prompts and says how to render them.
  const audio = [];
  if (opts.music) {
    process.stderr.write(`  rendering ${plan.tracks.length} tracks with ${opts.music} (paid)...\n`);
    plan.tracks.forEach((track, i) => {
      process.stderr.write(`  ${i + 1}/${plan.tracks.length} ${track.title}...\n`);
      audio.push(trackAudio(outDir, i, track.mood, opts.duration, opts.music));
    });
  }

  const hint = opts.music
    ? null
    : `Audio is opt-in because every music model is paid-only: re-run with --music elevenlabs/music-v2.5 to render these ${plan.tracks.length} prompts into loops.`;
  releaseCard(outDir, plan, cover, audio, opts.idea, hint);
  writeFileSync(
    join(outDir, "release.json"),
    JSON.stringify(
      { idea: opts.idea, ...plan, cover, audio, audioModel: opts.music, duration: opts.duration },
      null,
      2,
    ),
  );

  process.stdout.write(`${outDir}\n`);
  process.stdout.write(`open ${join(outDir, "index.html")}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`mixtape: ${err.message}\n`);
  process.exit(1);
}
