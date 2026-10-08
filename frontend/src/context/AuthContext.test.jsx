import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../utils/api', () => ({
  authAPI: { login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));
import { authAPI } from '../utils/api';

let ctx;
const Probe = () => {
  ctx = useAuth();
  return <div>{ctx.loading ? 'loading' : ctx.isAuthenticated ? `in:${ctx.user.email}` : 'out'}</div>;
};
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => vi.clearAllMocks());

describe('AuthContext', () => {
  it('restores session from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'a@b.com' }));
    localStorage.setItem('access_token', 't');
    mount();
    expect(screen.getByText('in:a@b.com')).toBeInTheDocument();
  });

  it('is logged out without a stored token', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'a@b.com' }));
    mount();
    expect(screen.getByText('out')).toBeInTheDocument();
  });

  it('login stores tokens and user', async () => {
    authAPI.login.mockResolvedValue({ data: { user: { email: 'a@b.com' }, tokens: { access: 'A', refresh: 'R' } } });
    mount();
    let res;
    await act(async () => { res = await ctx.login('a@b.com', 'pw'); });
    expect(res).toEqual({ success: true });
    expect(localStorage.getItem('access_token')).toBe('A');
    expect(localStorage.getItem('refresh_token')).toBe('R');
    expect(screen.getByText('in:a@b.com')).toBeInTheDocument();
  });

  it('login failure surfaces the server error', async () => {
    authAPI.login.mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } });
    mount();
    let res;
    await act(async () => { res = await ctx.login('a@b.com', 'bad'); });
    expect(res).toEqual({ success: false, error: 'Invalid credentials' });
    expect(screen.getByText('out')).toBeInTheDocument();
  });

  it('register failure returns server payload', async () => {
    authAPI.register.mockRejectedValue({ response: { data: { email: ['taken'] } } });
    mount();
    let res;
    await act(async () => { res = await ctx.register('a@b.com', 'n', 'pw', 'pw'); });
    expect(res.success).toBe(false);
    expect(res.error).toEqual({ email: ['taken'] });
  });

  it('logout clears storage even if the API call fails', async () => {
    localStorage.setItem('user', JSON.stringify({ email: 'a@b.com' }));
    localStorage.setItem('access_token', 't');
    localStorage.setItem('refresh_token', 'r');
    authAPI.logout.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    await act(async () => { await ctx.logout(); });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(screen.getByText('out')).toBeInTheDocument();
  });

  it('useAuth outside provider throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
  });
});
