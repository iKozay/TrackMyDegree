import {spawn} from "child_process";

//This function allows the server to run any scraper (there is only one for now) by giving the path to the script and the arguments
//Arguments would vary by script check each script for a comment there
export function runScraper(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn("python", [scriptPath, ...args]);

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Python error (code ${code}): ${errorOutput}`));
      }
    });
  });
}