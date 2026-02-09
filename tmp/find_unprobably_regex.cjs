const fs = require("fs");
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
let inDQ = false,
    inSQ = false,
    inBT = false,
    escaped = false;
for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && !escaped) {
        escaped = true;
        continue;
    }
    if (!escaped) {
        if (ch === '"' && !inSQ && !inBT) inDQ = !inDQ;
        if (ch === "'" && !inDQ && !inBT) inSQ = !inSQ;
        if (ch === "`" && !inDQ && !inSQ) inBT = !inBT;
    }
    escaped = false;
    if (!inDQ && !inSQ && !inBT && ch === "/") {
        const prev = s[i - 1] || "";
        const next = s[i + 1] || "";
        if (prev !== "<" && next !== "/" && next !== "*") {
            const loc = s
                .slice(Math.max(0, i - 30), Math.min(s.length, i + 30))
                .replace(/\n/g, "\\n");
            const line = s.slice(0, i).split("\n").length;
            console.log(
                "possible regex at idx",
                i,
                "line",
                line,
                "prev",
                prev,
                "next",
                next,
                "ctx",
                loc,
            );
        }
    }
}
