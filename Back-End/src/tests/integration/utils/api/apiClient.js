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

    const token = accessTokenCookie.split('access_token=')[1].split(';')[0];
    return token;
  }

  async login(credentials) {
    await this.get(`${this.base}/degree`, 401); // safe GET route to get csrf token

    const loginResponse = await this.post(`${this.base}/auth/login`, credentials);
    const token = this.extractTokenFromCookies(loginResponse);
    this.setAuthToken(token);
    
    // Extract CSRF token from response headers after login
    const csrfToken = loginResponse.headers['x-csrf-token'];
    if (csrfToken) {
      this.setCsrfToken(csrfToken);
    }
    
    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    const request = require('supertest')(this.app).post(endpoint).send(data);

    if (this.authToken) {
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    if (this.csrfToken) {
      request.set('X-CSRF-Token', this.csrfToken);
    }

    return await request.expect(expectedStatus);
  }

  async get(endpoint, expectedStatus = 200) {
    const request = require('supertest')(this.app).get(endpoint);

    if (this.authToken) {
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    // GET requests don't need CSRF tokens, but capture it from response for future use
    const response = await request.expect(expectedStatus);
    
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