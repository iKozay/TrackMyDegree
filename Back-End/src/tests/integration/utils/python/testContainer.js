const { GenericContainer, Wait } = require('testcontainers');
const path = require('node:path');

// Build a container image from the root-level python_utils/Dockerfile
// and provide helpers to start/stop it in tests.

const pythonUtilsDir = path.resolve(__dirname, '../../../../../python_utils');
let container = null;
/**
 * Builds the custom Python utils image from Dockerfile and starts the container.
 * Returns connection info for globalSetup to set PYTHON_UTILS_URL.
 */
async function startPythonUtilsContainer() {
  console.log('Building Python utils Docker image...');

  const build = await GenericContainer.fromDockerfile(pythonUtilsDir).build();

  console.log('Starting Python utils container...');
  container = await build
    .withExposedPorts(15001)
    .withWaitStrategy(Wait.forHttp('/health', 15001))
    .withStartupTimeout(300000)
    .start();

  const host = container.getHost();
  const mappedPort = container.getMappedPort(15001);
  const url = `http://${host}:${mappedPort}`;

  console.log(`Python utils container started at ${url}`);

  return { container, host, port: mappedPort, url };
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
