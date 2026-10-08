import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const state = { isAuthenticated: false, loading: false };
vi.mock('../context/AuthContext', () => ({ useAuth: () => state }));

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/secret" element={<ProtectedRoute><div>secret</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );

it('redirects anonymous users to /login', () => {
  Object.assign(state, { isAuthenticated: false, loading: false });
  renderAt();
  expect(screen.getByText('login page')).toBeInTheDocument();
});

it('renders children when authenticated', () => {
  Object.assign(state, { isAuthenticated: true, loading: false });
  renderAt();
  expect(screen.getByText('secret')).toBeInTheDocument();
});

it('shows neither while loading', () => {
  Object.assign(state, { isAuthenticated: false, loading: true });
  renderAt();
  expect(screen.queryByText('secret')).toBeNull();
  expect(screen.queryByText('login page')).toBeNull();
});
