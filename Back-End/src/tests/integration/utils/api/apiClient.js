/*
 * Custom API client for integration tests using Supertest.
 * Handles authentication via cookies and provides methods for making requests.
 */
class ApiClient {
  constructor(app) {
    this.app = app;
    this.authToken = null;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  // Extract token from Set-Cookie header
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

    // Extract token value from cookie string
    const token = accessTokenCookie.split('access_token=')[1].split(';')[0];
    return token;
  }

  // Login method that handles authentication and token extraction
  async login(credentials) {
    const loginResponse = await this.post('/auth/login', credentials);
    const token = this.extractTokenFromCookies(loginResponse);
    this.setAuthToken(token);
    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    const request = require('supertest')(this.app).post(endpoint).send(data);

    if (this.authToken) {
      // Use cookie authentication instead of Bearer token
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    return await request.expect(expectedStatus);
  }

  async get(endpoint, expectedStatus = 200) {
    const request = require('supertest')(this.app).get(endpoint);

    if (this.authToken) {
      // Use cookie authentication instead of Bearer token
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    return await request.expect(expectedStatus);
  }

  async seedAllData() {
    return await this.get('/api/admin/seed-data');
  }
}

module.exports = ApiClient;
