import axios, { AxiosError } from 'axios';
import { vi, it, expect, beforeEach } from 'vitest';
import api from './api';

const respond = (config, status, data = {}) => ({ data, status, statusText: '', headers: {}, config });

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem('access_token', 'old-access');
  localStorage.setItem('refresh_token', 'old-refresh');
});

it('sends the bearer token and the demo id header', async () => {
  let seen;
  api.defaults.adapter = async (config) => {
    seen = config;
    return respond(config, 200);
  };
  await api.get('/x');
  expect(seen.headers.Authorization).toBe('Bearer old-access');
  expect(seen.headers['X-Demo-User']).toBeTruthy();
});

it('on 401 refreshes once, stores BOTH rotated tokens, and retries the request', async () => {
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access', refresh: 'new-refresh' } });
  let calls = 0;
  api.defaults.adapter = async (config) => {
    calls += 1;
    if (calls === 1) {
      throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, {}, respond(config, 401));
    }
    return respond(config, 200, { ok: true });
  };
  const res = await api.get('/protected');
  expect(res.data).toEqual({ ok: true });
  expect(post).toHaveBeenCalledWith(expect.stringContaining('/api/users/token/refresh/'), { refresh: 'old-refresh' });
  expect(localStorage.getItem('access_token')).toBe('new-access');
  expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  expect(calls).toBe(2);
});
