// front-end/src/api/http-api-client.test.js
import { api } from '../api/http-api-client';
import { request } from '../api/request';

// Mock global fetch
global.fetch = jest.fn();

describe('http-api-client', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test('api.get calls request with correct URL and headers', async () => {
    localStorage.setItem('token', 'abc123');

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });

    const response = await api.get('/test-endpoint');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
        }),
      }),
    );

    expect(response).toEqual({ success: true });
  });

  test('request throws error for non-ok response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });

    await expect(request('http://localhost/test')).rejects.toThrow('HTTP 404: Not Found');
  });

  test('request returns text when Content-Type is not JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/plain' },
      text: async () => 'Hello World',
    });

    const response = await request('http://localhost/text');
    expect(response).toBe('Hello World');
  });
});
