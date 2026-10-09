import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect, beforeEach } from 'vitest';
import Dashboard from './Dashboard';

vi.mock('../utils/api', () => ({
  default: { defaults: { baseURL: 'http://api.test' } },
  coursesAPI: { listCourses: vi.fn(), deleteCourse: vi.fn() },
  authAPI: { getProfile: vi.fn() },
}));
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div>, Logo: () => null }));
const auth = { isAuthenticated: false, updateUser: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
import { coursesAPI, authAPI } from '../utils/api';

const course = (id, title, progress) => ({
  id, title, description: `About ${title}`, category: 'AI', thumbnail: '', progress_percentage: progress,
});

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/course/:id" element={<div>course page</div>} />
        <Route path="/add-course" element={<div>add page</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('demoPopupSeen', 'true'); // skip the first-visit modal
  auth.isAuthenticated = false;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
});

it('pings the configured backend, then shows the empty state', async () => {
  coursesAPI.listCourses.mockResolvedValue({ data: [] });
  mount();
  expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
  expect(await screen.findByText(/no courses yet/i)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('http://api.test/ping/', { mode: 'no-cors' });
});

it('computes overview stats from the course list', async () => {
  coursesAPI.listCourses.mockResolvedValue({
    data: [course('1', 'Alpha', 100), course('2', 'Beta', 50), course('3', 'Gamma', 0)],
  });
  mount();
  const overview = await screen.findByRole('region', { name: /overview/i });
  expect(within(overview).getByText('50%')).toBeInTheDocument(); // average of 100, 50, 0
  expect(within(overview).getByText('across 3 courses')).toBeInTheDocument();
  expect(within(overview).getByText('1/3')).toBeInTheDocument(); // finished courses
  expect(screen.getByRole('button', { name: /open beta/i })).toBeInTheDocument();
});

it('opens a course when its card is clicked', async () => {
  coursesAPI.listCourses.mockResolvedValue({ data: [course('abc', 'Alpha', 10)] });
  mount();
  await userEvent.click(await screen.findByRole('button', { name: /open alpha/i }));
  expect(await screen.findByText('course page')).toBeInTheDocument();
});

it('deletes a course after confirmation without calling the profile API for demo users', async () => {
  coursesAPI.listCourses.mockResolvedValue({ data: [course('1', 'Alpha', 0), course('2', 'Beta', 0)] });
  coursesAPI.deleteCourse.mockResolvedValue({});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  mount();
  await userEvent.click(await screen.findByRole('button', { name: /delete alpha/i }));
  await waitFor(() => expect(screen.queryByRole('button', { name: /open alpha/i })).toBeNull());
  expect(coursesAPI.deleteCourse).toHaveBeenCalledWith('1');
  expect(authAPI.getProfile).not.toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled(); // used to alert "Failed to delete" because of the profile call
});

it('does not delete when the user cancels', async () => {
  coursesAPI.listCourses.mockResolvedValue({ data: [course('1', 'Alpha', 0)] });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  mount();
  await userEvent.click(await screen.findByRole('button', { name: /delete alpha/i }));
  expect(coursesAPI.deleteCourse).not.toHaveBeenCalled();
});

it('shows a retry card when the course list cannot be loaded', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  coursesAPI.listCourses.mockRejectedValue(new Error('network'));
  mount();
  expect(await screen.findByText(/couldn.t reach the server/i)).toBeInTheDocument();
});

it('shows the welcome modal only on the first visit', async () => {
  localStorage.removeItem('demoPopupSeen');
  coursesAPI.listCourses.mockResolvedValue({ data: [] });
  mount();
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent(/welcome to the demo/i);
  await userEvent.click(screen.getByRole('button', { name: /got it/i }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(localStorage.getItem('demoPopupSeen')).toBe('true');
});
