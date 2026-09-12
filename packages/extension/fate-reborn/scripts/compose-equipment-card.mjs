import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const cards = resolve(import.meta.dirname, "../assets/cards");

async function dataUri(name) {
  const data = await readFile(resolve(cards, name));
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function buildEquipmentCard({ id, title, sourceName, iconName }) {
  const [source, icon] = await Promise.all([
    dataUri(sourceName),
    dataUri(iconName),
  ]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 272 370">
  <image href="${source}" width="272" height="370"/>
  <rect x="18" y="31" width="42" height="58" fill="#25303a"/>
  <rect x="58" y="34" width="164" height="49" rx="3" fill="#e4d3ca"/>
  <text x="140" y="66" text-anchor="middle" font-family="Songti SC, STSong, serif" font-size="20" font-weight="bold" fill="#1f1b1a">${title}</text>
  <rect x="27" y="91" width="218" height="181" rx="4" fill="#071b27"/>
  <radialGradient id="glow" cx="50%" cy="47%" r="55%"><stop offset="0" stop-color="#397f9d"/><stop offset="1" stop-color="#06131d"/></radialGradient>
  <rect x="30" y="94" width="212" height="175" rx="3" fill="url(#glow)"/>
  <image href="${icon}" x="47" y="105" width="178" height="150" preserveAspectRatio="xMidYMid meet"/>
  <rect x="0" y="270" width="272" height="100" fill="#25303a"/>
  <rect x="4" y="274" width="264" height="92" fill="#13242d"/>
</svg>`;
  await writeFile(resolve(cards, `${id}.svg`), svg);
}

const [id = "fate_eye_of_skadi", title = "冰魄之眼", sourceName = "fate_eye_of_skadi_source.png", iconName = "fate_eye_of_skadi_icon.png"] = process.argv.slice(2);
await buildEquipmentCard({ id, title, sourceName, iconName });
