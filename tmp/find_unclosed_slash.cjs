const fs = require("fs");
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
let inDQ = false,
    inSQ = false,
    inBT = false,
    escaped = false,
    inLine = false,
    inBlock = false;
function isEscaped(i) {
    let c = 0;
    while (i - 1 - c >= 0 && s[i - 1 - c] == "\\") c++;
    return c % 2 == 1;
}
for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1] || "";
    if (inLine) {
        if (ch == "\n") inLine = false;
        continue;
    }
    if (inBlock) {
        if (ch == "*" && next == "/") {
            inBlock = false;
            i++;
            continue;
        } else continue;
    }
    if (ch == "/" && next == "/") {
        inLine = true;
        i++;
        continue;
    }
    if (ch == "/" && next == "*") {
        inBlock = true;
        i++;
        continue;
    }
    if (ch == "\\" && !escaped) {
        escaped = true;
        continue;
    }
    if (!escaped) {
        if (ch == '"' && !inSQ && !inBT) inDQ = !inDQ;
        if (ch === "'" && !inDQ && !inBT) inSQ = !inSQ;
        if (ch == "`" && !inDQ && !inSQ) inBT = !inBT;
    }
    escaped = false;
    if (!inDQ && !inSQ && !inBT && ch == "/") {
        // ignore html close tag handled as '<' then '/'
        const prev = s[i - 1] || "";
        const nextc = s[i + 1] || "";
        if (prev == "<" || nextc == "/" || nextc == "*") continue;
        // find matching unescaped slash
        let found = false;
        for (let j = i + 1; j < s.length; j++) {
            const ch2 = s[j];
            if (ch2 == "\\") {
                j++;
                continue;
            }
            if (ch2 == "/") {
                found = true;
                break;
            }
            if (ch2 == "\n") break; // no multiline regex allowed without flags? regex can be multiline via \n escaped, but common
        }
        if (!found) {
            const line = s.slice(0, i).split("\n").length;
            console.log(
                "unclosed slash at idx",
                i,
                "line",
                line,
                "ctx",
                s
                    .slice(Math.max(0, i - 40), Math.min(s.length, i + 40))
                    .replace(/\n/g, "\\n"),
            );
        }
    }
}
