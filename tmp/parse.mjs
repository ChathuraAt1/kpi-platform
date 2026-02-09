import fs from "fs";
import { parse } from "@babel/parser";
const s = fs.readFileSync("resources/js/components/TaskLogGrid.jsx", "utf8");
try {
    parse(s, {
        sourceType: "module",
        plugins: ["jsx", "classProperties", "dynamicImport"],
    });
    console.log("parsed ok");
} catch (e) {
    console.error("parse error", e.message);
    console.error("loc", e.loc);
    if (e.codeFrame) console.error(e.codeFrame);
    process.exit(1);
}
