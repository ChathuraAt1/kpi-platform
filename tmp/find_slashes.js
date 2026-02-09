const fs = require("fs");
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
let inDQ = false,
    inSQ = false,
    escaped = false;
for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && !escaped) {
        escaped = true;
        continue;
    }
    if (!escaped && ch === '"' && !inSQ) inDQ = !inDQ;
    if (!escaped && ch === "'" && !inDQ) inSQ = !inSQ;
    if (!inDQ && !inSQ && ch === "/") {
        const ctx = s.slice(Math.max(0, i - 40), Math.min(s.length, i + 40));
        const linesBefore = s.slice(0, i).split("\n").length;
        console.log(
            "slash at idx",
            i,
            "line",
            linesBefore,
            "ctx:",
            ctx.replace(/\n/g, "\\n"),
        );
    }
    escaped = false;
}
