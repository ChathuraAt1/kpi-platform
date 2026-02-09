import fs from "fs";
import { parse } from "@babel/parser";
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
let lo = 0,
    hi = s.length;
let lastGood = 0,
    firstBad = hi;
// find first index where parse fails
while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const subs = s.slice(0, mid);
    try {
        parse(subs, {
            sourceType: "module",
            plugins: ["jsx", "classProperties", "dynamicImport"],
        });
        lastGood = mid;
        lo = mid + 1;
    } catch (e) {
        firstBad = mid;
        hi = mid;
    }
}
console.log("lastGood", lastGood, "firstBad", firstBad);
console.log("lastGood line", s.slice(0, lastGood).split("\n").length);
console.log("firstBad line", s.slice(0, firstBad).split("\n").length);
console.log("context around firstBad:");
console.log(
    s
        .slice(Math.max(0, firstBad - 120), Math.min(s.length, firstBad + 120))
        .replace(/\n/g, "\\n"),
);
