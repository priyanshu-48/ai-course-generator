import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect } from 'vitest';
import Layout from './Layout';

const auth = { isAuthenticated: false, user: null, logout: vi.fn().mockResolvedValue() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Layout><p>page body</p></Layout>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/add-course" element={<div>add page</div>} />
      </Routes>
    </MemoryRouter>
  );

it('renders navigation and the page content', () => {
  Object.assign(auth, { isAuthenticated: false, user: null });
  mount();
  expect(screen.getByText('page body')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: /new course/i })).toHaveAttribute('href', '/add-course');
  expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
});

it('shows the user and logs out to the login page', async () => {
  Object.assign(auth, { isAuthenticated: true, user: { email: 'a@b.com' } });
  mount();
  expect(screen.getByText('a@b.com')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /log out/i }));
  expect(auth.logout).toHaveBeenCalled();
  expect(await screen.findByText('login page')).toBeInTheDocument();
});
