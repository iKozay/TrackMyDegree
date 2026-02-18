const { GenericContainer } = require('testcontainers');
const path = require('node:path');

// Build a container image from the root-level python_utils/Dockerfile
// and provide helpers to start/stop it in tests.

const pythonUtilsDir = path.resolve(__dirname, '../../../../../python_utils');
let container = null;
/**
 * Builds the custom Python utils image from Dockerfile and starts the container.
 */
async function startPythonUtilsContainer() {
  // Build image from Dockerfile at python_utils/
  console.log('Building Python utils Docker image...');

  const build = await GenericContainer.fromDockerfile(pythonUtilsDir).build();

  console.log('Starting Python utils container...');
  container = await build
    .withExposedPorts({
      container: 15001,
      host: 15001,
    })
    .start();

  console.log('Python utils container started');

  // wait until api is responsive before proceeding with tests
  await apiReady();
}

async function apiReady() {
  console.log('Checking Python Utils API health...');
  const maxTries = 3;
  for (let tries = 0; tries < maxTries; tries++) {
    try {
      // This will trigger initialization which takes around 3 mins
      const res = await globalThis.fetch('http://localhost:15001/health');
      if (res.ok) {
        console.log('Python utils API is ready');
        return;
      }
    } catch (e) {
      console.error(`Error connecting to Python utils API: ${e.message}`);
    }
    console.log(`Python utils API not ready yet. Retrying... (${tries + 1}/${maxTries})`);
  }
}

/**
 * Stops and removes the given container if defined.
 */
async function stopPythonUtilsContainer() {
  if (!container) return;
  try {
    await container.stop({ timeout: 30000 });
  } catch (e) {
    console.warn('Failed to stop python utils container:', e);
  }
}

module.exports = {
  startPythonUtilsContainer,
  stopPythonUtilsContainer,
};
