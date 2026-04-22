import * as process from "node:process";

const isWindows = process.platform === "win32";

if (isWindows) {
  console.log("Running on Windows");
} else {
  throw new Error("Builds are only supported on Windows");
}
