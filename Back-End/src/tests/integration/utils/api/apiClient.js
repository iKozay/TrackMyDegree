const supertest = require('supertest');

/*
 * Custom API client for integration tests using Supertest.
 * Handles authentication via cookies and CSRF tokens.
 */
class ApiClient {
  constructor(app) {
    this.app = app;
    this.agent = supertest.agent(app);
    this.csrfToken = null;
    this.base = '/api';
  }

  setCsrfToken(token) {
    this.csrfToken = token;
  }

  extractTokenFromCookies(response) {
    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies found in login response');
    }

    const accessTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('access_token='),
    );

    if (!accessTokenCookie) {
      throw new Error('access_token cookie not found in login response');
    }

    return accessTokenCookie.split('access_token=')[1].split(';')[0];
  }

  async login(credentials) {
    // Safe GET request to initialize CSRF token
    await this.get(`${this.base}/degree`, 200);

    // Unsafe POST login now includes valid CSRF token
    const loginResponse = await this.post(
      `${this.base}/auth/login`,
      credentials
    );

    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    let request = this.agent.post(endpoint);

    console.log('CSRF TOKEN in post - ', this.csrfToken);

    if (this.csrfToken) {
      request = request.set('X-CSRF-Token', this.csrfToken);
    }

    const response = await request.send(data).expect(expectedStatus);

    // Refresh CSRF token
    if (response.headers['x-csrf-token']) {
      this.setCsrfToken(response.headers['x-csrf-token']);
    }

    return response;
  }

  async get(endpoint, expectedStatus = 200) {
    const response = await this.agent
      .get(endpoint)
      .expect(expectedStatus);

    console.log('CSRF TOKEN in get - ', response.headers['x-csrf-token']);

    // Capture CSRF token for future unsafe requests
    if (response.headers['x-csrf-token']) {
      this.setCsrfToken(response.headers['x-csrf-token']);
    }

    return response;
  }

  async seedDegreeData() {
    console.log(this.agent.jar.getCookies({ path: '/', secure: false }));
    return await this.get(`${this.base}/admin/seed-data`);
  }
}

module.exports = ApiClient;