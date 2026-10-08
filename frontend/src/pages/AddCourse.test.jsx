import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect, beforeEach } from 'vitest';
import AddCourse from './AddCourse';

vi.mock('../utils/api', () => ({ coursesAPI: { createCourse: vi.fn() } }));
vi.mock('../components/Sidebar', () => ({ default: () => null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null, updateUser: vi.fn() }) }));
import { coursesAPI } from '../utils/api';

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/add']}>
      <Routes>
        <Route path="/add" element={<AddCourse />} />
        <Route path="/course/:id" element={<div>course page</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());

async function fill() {
  await userEvent.type(screen.getByLabelText(/course title/i), 'Deep Learning');
  await userEvent.type(screen.getByLabelText(/description/i), 'Neural nets from scratch');
}

it('submits the form and navigates to the new course', async () => {
  coursesAPI.createCourse.mockResolvedValue({ data: { id: 'abc' } });
  mount();
  await fill();
  await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Data Science');
  await userEvent.click(screen.getByRole('button', { name: /generate|create/i }));
  await waitFor(() => expect(screen.getByText('course page')).toBeInTheDocument());
  expect(coursesAPI.createCourse).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Deep Learning', description: 'Neural nets from scratch', category: 'Data Science' })
  );
});

it('shows the backend error when generation fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  coursesAPI.createCourse.mockRejectedValue({ response: { status: 500, data: { error: 'Failed to generate course: boom' } } });
  mount();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: /generate|create/i }));
  expect(await screen.findByText(/failed to generate course: boom/i)).toBeInTheDocument();
});
