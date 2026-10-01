import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const staticAssets = path.join(projectRoot, ".next", "static");
const standaloneNext = path.join(projectRoot, ".next", "standalone", ".next");

await mkdir(standaloneNext, { recursive: true });
await cp(staticAssets, path.join(standaloneNext, "static"), { recursive: true, force: true });
