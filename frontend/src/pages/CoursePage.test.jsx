import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, it, expect, beforeEach } from 'vitest';
import CoursePage from './CoursePage';

vi.mock('../utils/api', () => ({
  coursesAPI: { getCourse: vi.fn(), updateProgress: vi.fn(), toggleSubtopic: vi.fn() },
}));
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div>, Logo: () => null }));
import { coursesAPI } from '../utils/api';

const course = () => ({
  id: 'c1', title: 'My Course', current_module_index: 0, current_subtopic_index: 0,
  modules: [{
    title: 'Mod 1', order: 0,
    subtopics: [
      { title: 'Lesson A', video_url: 'https://www.youtube.com/watch?v=abc', content: 'About A', order: 0, completed: false },
      { title: 'Lesson B', video_url: 'search:lesson b', content: 'About B', order: 1, completed: false },
    ],
  }],
});

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/course/c1']}>
      <Routes><Route path="/course/:id" element={<CoursePage />} /></Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  coursesAPI.getCourse.mockResolvedValue({ data: course() });
  coursesAPI.updateProgress.mockResolvedValue({});
});

it('loads and renders the course with an embedded video', async () => {
  const { container } = mount();
  expect(await screen.findByText('About A')).toBeInTheDocument();
  expect(container.querySelector('iframe').src).toContain('youtube.com/embed/abc');
});

it('shows an error when the course fails to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  coursesAPI.getCourse.mockRejectedValue(new Error('404'));
  mount();
  expect(await screen.findByText(/failed to load course/i)).toBeInTheDocument();
});

it('selecting a lesson saves the position', async () => {
  mount();
  await userEvent.click(await screen.findByText('Lesson B'));
  await waitFor(() =>
    expect(coursesAPI.updateProgress).toHaveBeenCalledWith('c1', { module_index: 0, subtopic_index: 1 })
  );
  expect(await screen.findByText('About B')).toBeInTheDocument();
});

it('toggling completion calls the API and updates the UI', async () => {
  coursesAPI.toggleSubtopic.mockResolvedValue({
    data: { ...course().modules[0].subtopics[0], completed: true },
  });
  mount();
  await screen.findByText('About A');
  await userEvent.click(screen.getByRole('button', { name: /mark.*complete/i }));
  await waitFor(() => expect(coursesAPI.toggleSubtopic).toHaveBeenCalledWith('c1', 0, 0));
  expect(await screen.findByRole('button', { name: /completed|mark.*incomplete|undo/i })).toBeInTheDocument();
});
