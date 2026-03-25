import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const src = "src/app/icon.png";
const destIcons = "public/icons";
const destPublic = "public";

mkdirSync(destIcons, { recursive: true });

const bg = { r: 9, g: 9, b: 11, alpha: 1 };

const icons = [
  { name: "icon-192.png",          size: 192, dir: destIcons, maskable: false },
  { name: "icon-512.png",          size: 512, dir: destIcons, maskable: false },
  { name: "icon-maskable-512.png", size: 512, dir: destIcons, maskable: true  },
  { name: "apple-touch-icon.png",  size: 180, dir: destPublic, maskable: false },
];

for (const icon of icons) {
  const out = join(icon.dir, icon.name);
  let pipeline;
  if (icon.maskable) {
    const padded = Math.round(icon.size * 0.8);
    const pad    = Math.round(icon.size * 0.1);
    pipeline = sharp(src)
      .resize(padded, padded, { fit: "contain", background: bg })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg });
  } else {
    pipeline = sharp(src).resize(icon.size, icon.size, { fit: "contain", background: bg });
  }
  await pipeline.png().toFile(out);
  console.log("OK " + icon.name);
}

console.log("Done!");
