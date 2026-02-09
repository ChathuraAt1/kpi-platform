const fs = require("fs");
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
const idx = 43423;
const start = Math.max(0, idx - 80);
const end = Math.min(s.length, idx + 80);
const seg = s.slice(start, end);
console.log("start", start, "end", end, "len", s.length);
for (let i = 0; i < seg.length; i++) {
    const ch = seg[i];
    const pos = start + i;
    const display = ch === "\n" ? "\\n" : ch;
    const code = ch.charCodeAt ? ch.charCodeAt(0) : "NA";
    console.log(pos, display, code);
}
console.log("--- segment ---");
console.log(seg.replace(/\n/g, "\\n"));
console.log("--- lines ---");
const before = s.slice(0, idx).split("\n");
console.log(
    "line at idx",
    before.length,
    "line text:",
    before[before.length - 1],
);
const after = s.slice(idx).split("\n");
console.log("next line:", after[0]);
