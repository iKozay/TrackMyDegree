const supertest = require('supertest');

/*
 * Custom API client for integration tests using Supertest.
 * Handles authentication via cookies and CSRF tokens.
 */
class ApiClient {
  constructor(app) {
    this.app = app;
    this.agent = supertest.agent(app);
    this.authToken = null;
    this.csrfToken = null;
    this.base = '/api';
  }

  setAuthToken(token) {
    this.authToken = token;
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
    // Initialize csrf token with safe GET request
    await this.get(`${this.base}/degree`, 200);

    // Login with csrf token
    const loginResponse = await this.post(
      `${this.base}/auth/login`,
      credentials
    );

    // Extract access token from login response
    const token = this.extractTokenFromCookies(loginResponse);
    this.setAuthToken(token);

    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    let request = this.agent.post(endpoint);

    if (this.authToken) {
      request = request.set('Cookie', `access_token=${this.authToken}`);
    }

    if (this.csrfToken) {
      request = request.set('X-CSRF-Token', this.csrfToken);
    }

    return await request.send(data).expect(expectedStatus);
  }

  async get(endpoint, expectedStatus = 200) {
    let request = this.agent.get(endpoint);

    if (this.authToken) {
      request = request.set('Cookie', `access_token=${this.authToken}`);
    }

    const response = await request.expect(expectedStatus);

    // Refresh csrf token
    if (response.headers['x-csrf-token']) {
      this.setCsrfToken(response.headers['x-csrf-token']);
    }

    return response;
  }

  async seedDegreeData() {
    return await this.get(`${this.base}/admin/seed-data`);
  }
}

module.exports = ApiClient;