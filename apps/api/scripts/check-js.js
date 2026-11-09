import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "supportops", "scripts"];
const files = [];
function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && full.endsWith(".js")) files.push(full);
    }
}
for (const root of roots) walk(root);
files.push("sitemap.js");
let failed = false;
for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
    if (result.status !== 0) {
        failed = true;
        console.error(`Syntax validation failed: ${relative(process.cwd(), file)}`);
    }
}
if (failed) process.exit(1);
console.log(`Validated JavaScript syntax in ${files.length} files.`);
