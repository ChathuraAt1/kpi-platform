const fs = require("fs");
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
let inDQ = false,
    inSQ = false,
    inBT = false,
    escaped = false,
    inLine = false,
    inBlock = false;
for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1] || "";
    if (inLine) {
        if (ch === "\n") inLine = false;
        continue;
    }
    if (inBlock) {
        if (ch === "*" && next === "/") {
            inBlock = false;
            i++;
            continue;
        } else continue;
    }
    if (ch === "/" && next === "/") {
        inLine = true;
        i++;
        continue;
    }
    if (ch === "/" && next === "*") {
        inBlock = true;
        i++;
        continue;
    }
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
    if (!inDQ && !inSQ && !inBT && !inLine && !inBlock && ch === "/") {
        const prev = s[i - 1] || "";
        const nextc = s[i + 1] || "";
        if (prev !== "<" && nextc !== "/" && nextc !== "*") {
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
                nextc,
                "ctx",
                loc,
            );
        }
    }
}
