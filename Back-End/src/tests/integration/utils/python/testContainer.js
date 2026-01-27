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
