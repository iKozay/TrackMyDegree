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
    // Send a safe GET route to init CSRF token
    await this.get(`${this.base}/degree`, 200);

    // After init CSRF token, we can send unsafe requests (POST/PUT/PATCH/DELETE)
    const loginResponse = await this.post(`${this.base}/auth/login`, credentials);
    const token = this.extractTokenFromCookies(loginResponse);
    this.setAuthToken(token);
    
    return loginResponse;
  }

  async post(endpoint, data = {}, expectedStatus = 200) {
    const request = require('supertest')(this.app).post(endpoint).send(data);

    if (this.authToken) {
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    console.log("CSRF TOKEN in post - ", this.csrfToken);
    if (this.csrfToken) {
      request.set('X-CSRF-Token', this.csrfToken);
    }

    return await request.send(data).expect(expectedStatus);
  }

  async get(endpoint, expectedStatus = 200) {
    const request = require('supertest')(this.app).get(endpoint);

    if (this.authToken) {
      request.set('Cookie', `access_token=${this.authToken}`);
    }

    // GET requests don't need CSRF tokens, but capture it from response for future use
    const response = await request.expect(expectedStatus);
    
    console.log("CSRF TOKEN in get - ", response.headers['x-csrf-token']);
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