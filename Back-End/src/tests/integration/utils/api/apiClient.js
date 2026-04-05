/*
 * Custom API client for integration tests using Supertest.
 * Handles authentication via cookies and CSRF tokens.
 */
class ApiClient {
  constructor(app) {
    this.app = app;
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

  captureCsrfToken(response) {
    const token = response.headers['x-csrf-token'];
    if (token) {
      this.setCsrfToken(token);
    }
  }

  async login(credentials) {
    await this.get(`${this.base}/auth/me`, 401); // safe route to get csrf token
    const loginResponse = await this.post(
      `${this.base}/auth/login`,
      credentials
    );

    const token = this.extractTokenFromCookies(loginResponse);
    this.setAuthToken(token);

    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    let request = require('supertest')(this.app)
      .post(endpoint)
      .send(data);

    if (this.authToken) {
      // Use cookie authentication instead of Bearer token
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    if (this.csrfToken) {
      request.set('X-CSRF-Token', this.csrfToken);
    }

    const response = await request.expect(expectedStatus);
    this.captureCsrfToken(response); // keep token fresh
    return response;
  }

  async get(endpoint, expectedStatus = 200) {
    let request = require('supertest')(this.app).get(endpoint);

    if (this.authToken) {
      // Use cookie authentication instead of Bearer token
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    const response = await request.expect(expectedStatus);
    this.captureCsrfToken(response); // capture token from safe requests
    return response;
  }

  async seedDegreeData() {
    return await this.get(`${this.base}/admin/seed-data`);
  }
}

module.exports = ApiClient;
