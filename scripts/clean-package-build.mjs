import { rmSync } from "node:fs";

// Run from the package directory so removed source files cannot survive in a tarball.
rmSync("dist", { recursive: true, force: true });
rmSync("tsconfig.tsbuildinfo", { force: true });
