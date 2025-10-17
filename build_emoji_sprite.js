// build_emoji_sprite.js
// Usage: node build_emoji_sprite.js ./emojis ./dist/emoji-sprite.svg

const fs = require("fs");
const path = require("path");

const [,, EMOJI_DIR = "./emojis", OUT = "./emoji-sprite.svg"] = process.argv;

function idFromFilename(name) {
  // create safe id: remove extension, replace invalid chars
  return "e_" + name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

const files = fs.readdirSync(EMOJI_DIR).filter(f => f.toLowerCase().endsWith('.svg'));
let symbols = "";

for (const file of files) {
  const filePath = path.join(EMOJI_DIR, file);
  let text = fs.readFileSync(filePath, "utf8");

  // Extract viewBox and inner contents
  const svgMatch = text.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  let attrs = "";
  let inner = text;
  if (svgMatch) {
    attrs = svgMatch[1] || "";
    inner = svgMatch[2] || "";
  }
  // Keep viewBox if present
  const vbMatch = attrs.match(/viewBox="([^"]+)"/i);
  const viewBoxAttr = vbMatch ? ` viewBox="${vbMatch[1]}"` : "";
  const id = idFromFilename(file);
  symbols += `<symbol id="${id}"${viewBoxAttr}>${inner}</symbol>\n`;
}

const out = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" style="display:none;">
${symbols}
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, "utf8");
console.log("Wrote sprite:", OUT, "symbols:", files.length);
