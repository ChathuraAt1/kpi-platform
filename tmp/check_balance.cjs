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
    if (i % 1000 == 0) {
        /* noop */
    }
}
console.log("inDQ", inDQ, "inSQ", inSQ, "inBT", inBT);
