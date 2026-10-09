import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect, beforeEach } from 'vitest';
import Login from './Login';
import Register from './Register';

const auth = { login: vi.fn(), register: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const mount = (ui) =>
  render(
    <MemoryRouter initialEntries={['/x']}>
      <Routes>
        <Route path="/x" element={ui} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());

it('login: signs in and goes home', async () => {
  auth.login.mockResolvedValue({ success: true });
  mount(<Login />);
  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'pw12345678');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByText('home')).toBeInTheDocument();
  expect(auth.login).toHaveBeenCalledWith('a@b.com', 'pw12345678');
});

it('login: shows the server error', async () => {
  auth.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
  mount(<Login />);
  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
});

it('register: blocks mismatched passwords without calling the API', async () => {
  mount(<Register />);
  await userEvent.type(screen.getByLabelText(/full name/i), 'Ada');
  await userEvent.type(screen.getByLabelText(/^email/i), 'a@b.com');
  await userEvent.type(screen.getByLabelText(/^password/i), 'password-one');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'password-two');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/don.t match/i);
  expect(auth.register).not.toHaveBeenCalled();
});

it('register: flattens field errors from the server', async () => {
  auth.register.mockResolvedValue({ success: false, error: { email: ['Already taken.'], password: ['Too short.'] } });
  mount(<Register />);
  await userEvent.type(screen.getByLabelText(/full name/i), 'Ada');
  await userEvent.type(screen.getByLabelText(/^email/i), 'a@b.com');
  await userEvent.type(screen.getByLabelText(/^password/i), 'password-one');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'password-one');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Already taken. Too short.'));
});
