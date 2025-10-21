const {spawn} = require("node:child_process");

//This function allows the server to run any scraper (there is only one for now) by giving the path to the script and the arguments
//Arguments would vary by script check each script for a comment there
function runScraper(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const PYTHON_PATH = "/usr/bin/python3";
    const process = spawn(PYTHON_PATH, [scriptPath, ...args], {
      shell:false,
      stdio: ["ignore", "pipe", "pipe"],
    });

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

module.exports = {runScraper};