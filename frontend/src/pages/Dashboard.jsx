import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout, { Logo } from '../components/Layout';
import api, { coursesAPI, authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { categoryColor, categoryInitial } from '../utils/categories';

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 5v14m7-7H5" />
  </svg>
);

const StatCard = ({ label, value, hint }) => (
  <div className="card flex min-w-0 flex-col justify-between">
    <p className="eyebrow">{label}</p>
    <div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  </div>
);

const ProgressBars = ({ courses }) => (
  <div className="min-w-0">
    <p className="eyebrow mb-3">Progress by course</p>
    <div className="relative flex h-32 items-end gap-2 border-t border-dashed border-line/80 pt-2">
      {courses.slice(0, 8).map((course) => {
        const color = categoryColor(course.category);
        return (
          <div key={course.id} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-md bg-panel-2" title={`${course.title}: ${course.progress_percentage}%`}>
              <div
                className="w-full rounded-md transition-all duration-500"
                style={{ height: `${Math.max(course.progress_percentage, 4)}%`, background: color }}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-faint">{course.title}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const CourseCard = ({ course, onOpen, onDelete }) => {
  const color = categoryColor(course.category);
  const done = course.progress_percentage === 100;
  return (
    <article className="group card flex flex-col !p-0 overflow-hidden transition hover:-translate-y-0.5 hover:border-accent/40">
      <button onClick={onOpen} className="text-left" aria-label={`Open ${course.title}`}>
        <div
          className="relative flex h-32 items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${color}55, ${color}11 70%), #1d1e31` }}
        >
          {course.thumbnail ? (
            <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl font-bold opacity-70" style={{ color }}>
              {categoryInitial(course.category)}
            </span>
          )}
          {done && <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-ink">Done</span>}
        </div>
        <div className="p-5 pb-4">
          <span className="chip">{course.category}</span>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug group-hover:text-accent">{course.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{course.description}</p>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>Progress</span>
              <span className="font-medium text-fg">{course.progress_percentage}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${course.progress_percentage}%` }} />
            </div>
          </div>
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between border-t border-line/50 px-5 py-3 text-sm">
        <button onClick={onOpen} className="font-medium text-accent hover:brightness-110">
          {course.progress_percentage > 0 && !done ? 'Continue' : done ? 'Review' : 'Start'} →
        </button>
        <button onClick={onDelete} className="text-muted transition hover:text-danger" aria-label={`Delete ${course.title}`}>
          Delete
        </button>
      </div>
    </article>
  );
};

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [backendAwake, setBackendAwake] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, updateUser } = useAuth();

  useEffect(() => {
    // The free-tier host sleeps when idle; ping it so the first real request is fast.
    const wakeBackend = async () => {
      try {
        await fetch(`${api.defaults.baseURL}/ping/`, { mode: 'no-cors' });
      } catch (err) {
        console.error('Backend ping failed:', err);
      } finally {
        setTimeout(() => setBackendAwake(true), 600);
      }
    };
    wakeBackend();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesAPI.listCourses();
        setCourses(response.data);
      } catch (err) {
        console.error('Failed to load courses:', err);
        setLoadError(true);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('demoPopupSeen')) {
      setShowPopup(true);
      localStorage.setItem('demoPopupSeen', 'true');
    }
  }, []);

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await coursesAPI.deleteCourse(courseId);
    } catch (err) {
      alert('Failed to delete course');
      return;
    }
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
    if (isAuthenticated) {
      try {
        updateUser((await authAPI.getProfile()).data);
      } catch (err) {
        console.error('Could not refresh profile:', err);
      }
    }
  };

  const stats = useMemo(() => {
    const total = courses.length;
    const sum = courses.reduce((acc, c) => acc + c.progress_percentage, 0);
    return {
      total,
      average: total ? Math.round(sum / total) : 0,
      completed: courses.filter((c) => c.progress_percentage === 100).length,
      inProgress: courses.filter((c) => c.progress_percentage > 0 && c.progress_percentage < 100).length,
    };
  }, [courses]);

  if (!backendAwake) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <Logo size={48} />
        <div className="loading-spinner" />
        <div>
          <p className="text-lg font-semibold">Waking up the server…</p>
          <p className="mt-1 text-sm text-muted">The free hosting tier sleeps when idle, so this can take 15–30 seconds.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout wide>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My courses</h1>
          <p className="mt-1 text-muted">Generate a course on any topic and track your progress lesson by lesson.</p>
        </div>
        <Link to="/add-course" className="btn-primary">
          <PlusIcon />
          Add course
        </Link>
      </div>

      {loadingCourses ? (
        <div className="flex justify-center py-24">
          <div className="loading-spinner" />
        </div>
      ) : loadError ? (
        <div className="card mx-auto max-w-lg text-center">
          <h2 className="text-lg font-semibold">Couldn&apos;t reach the server</h2>
          <p className="mt-2 text-sm text-muted">It may still be waking up. Give it a few seconds and try again.</p>
          <button onClick={() => window.location.reload()} className="btn-secondary mt-5">
            Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-line px-8 py-16 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <Logo size={56} />
          </div>
          <h2 className="text-xl font-semibold">No courses yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Describe a topic and the AI will build a full curriculum with a video for every lesson.
          </p>
          <Link to="/add-course" className="btn-primary mt-6">
            <PlusIcon />
            Create your first course
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 lg:grid-cols-3" aria-label="Overview">
            <div className="card min-w-0 lg:col-span-2">
              <div className="grid gap-6 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                <div>
                  <p className="eyebrow">Average progress</p>
                  <p className="mt-3 text-5xl font-bold tracking-tight">{stats.average}%</p>
                  <p className="mt-2 text-sm text-muted">
                    across {stats.total} {stats.total === 1 ? 'course' : 'courses'}
                  </p>
                  <div className="mt-4 flex gap-5 text-xs text-muted">
                    <div>
                      <p className="text-base font-semibold text-fg">{stats.inProgress}</p>
                      in progress
                    </div>
                    <div>
                      <p className="text-base font-semibold text-fg">{stats.completed}</p>
                      finished
                    </div>
                  </div>
                </div>
                <ProgressBars courses={courses} />
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-4 lg:grid-cols-1">
              <StatCard label="Courses" value={stats.total} hint="generated by AI" />
              <StatCard label="Finished" value={`${stats.completed}/${stats.total}`} hint="courses at 100%" />
            </div>
          </section>

          <h2 className="eyebrow mb-4">Your courses</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={() => navigate(`/course/${course.id}`)}
                onDelete={() => handleDeleteCourse(course.id)}
              />
            ))}
          </div>
        </>
      )}

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="card max-w-sm text-center">
            <div className="mb-4 flex justify-center">
              <Logo size={44} />
            </div>
            <h2 id="welcome-title" className="text-xl font-semibold">
              Welcome to the demo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Click <strong className="text-fg">Add course</strong>, describe a topic, and the AI builds a full course. Generating one takes
              about 30–60 seconds.
            </p>
            <button onClick={() => setShowPopup(false)} className="btn-primary mt-6 w-full">
              Got it
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
