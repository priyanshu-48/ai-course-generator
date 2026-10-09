import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { coursesAPI } from '../utils/api';
import { categoryColor } from '../utils/categories';

const CoursePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentSubtopicIndex, setCurrentSubtopicIndex] = useState(0);

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCourse = async () => {
    try {
      const response = await coursesAPI.getCourse(id);
      const courseData = response.data;
      setCourse(courseData);
      setCurrentModuleIndex(courseData.current_module_index || 0);
      setCurrentSubtopicIndex(courseData.current_subtopic_index || 0);
    } catch (err) {
      setError('Failed to load course');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSubtopic = () => {
    if (!course || !course.modules[currentModuleIndex]) return null;
    return course.modules[currentModuleIndex].subtopics[currentSubtopicIndex];
  };

  const handleSubtopicClick = async (moduleIndex, subtopicIndex) => {
    setCurrentModuleIndex(moduleIndex);
    setCurrentSubtopicIndex(subtopicIndex);

    try {
      await coursesAPI.updateProgress(id, {
        module_index: moduleIndex,
        subtopic_index: subtopicIndex,
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleToggleComplete = async () => {
    const currentSubtopic = getCurrentSubtopic();
    if (!currentSubtopic) return;

    try {
      const response = await coursesAPI.toggleSubtopic(id, currentModuleIndex, currentSubtopicIndex);

      setCourse((prevCourse) => {
        const newCourse = { ...prevCourse };
        newCourse.modules[currentModuleIndex].subtopics[currentSubtopicIndex] = response.data;
        return newCourse;
      });
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (url.startsWith('search:')) {
      const searchTerm = url.replace('search:', '').trim();
      const encodedSearch = encodeURIComponent(searchTerm);
      return `https://www.youtube.com/results?search_query=${encodedSearch}`;
    }

    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const lessons = course ? course.modules.flatMap((module, m) => module.subtopics.map((_, s) => [m, s])) : [];
  const position = lessons.findIndex(([m, s]) => m === currentModuleIndex && s === currentSubtopicIndex);
  const goTo = (offset) => {
    const target = lessons[position + offset];
    if (target) handleSubtopicClick(target[0], target[1]);
  };
  const doneCount = course
    ? course.modules.reduce((n, module) => n + module.subtopics.filter((s) => s.completed).length, 0)
    : 0;

  if (loading) {
    return (
      <Layout wide>
        <div className="flex justify-center py-32">
          <div className="loading-spinner" />
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="card mx-auto max-w-md text-center">
          <p className="mb-5 text-danger">{error || 'Course not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const currentSubtopic = getCurrentSubtopic();
  const accent = categoryColor(course.category);

  return (
    <Layout wide>
      <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="card flex max-h-[calc(100vh-7.5rem)] flex-col !p-0 lg:sticky lg:top-24 lg:self-start">
          <div className="border-b border-line/60 p-5">
            <button
              onClick={() => navigate('/')}
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h2 className="text-lg font-semibold leading-snug">{course.title}</h2>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>
                  {doneCount} of {lessons.length} lessons done
                </span>
                <span className="font-medium text-fg">{course.progress_percentage}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${course.progress_percentage}%`, background: accent }} />
              </div>
            </div>
          </div>

          <div className="space-y-5 overflow-y-auto p-3">
            {course.modules.map((module, moduleIndex) => (
              <div key={moduleIndex}>
                <h3 className="eyebrow mb-1.5 px-2">
                  {moduleIndex + 1}. {module.title}
                </h3>
                <div className="space-y-0.5">
                  {module.subtopics.map((subtopic, subtopicIndex) => {
                    const active = currentModuleIndex === moduleIndex && currentSubtopicIndex === subtopicIndex;
                    return (
                      <button
                        key={subtopicIndex}
                        onClick={() => handleSubtopicClick(moduleIndex, subtopicIndex)}
                        aria-current={active ? 'true' : undefined}
                        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                          active ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel-2/60 hover:text-fg'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            subtopic.completed ? 'border-accent bg-accent' : active ? 'border-accent' : 'border-line'
                          }`}
                          aria-hidden="true"
                        >
                          {subtopic.completed && (
                            <svg className="h-2.5 w-2.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="line-clamp-2">{subtopic.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {currentSubtopic ? (
            <>
              {currentSubtopic.video_url.startsWith('search:') ? (
                <div
                  className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-line/60 p-8 text-center"
                  style={{ background: `linear-gradient(135deg, ${accent}33, transparent 70%), #1d1e31` }}
                >
                  <svg className="mb-4 h-12 w-12 text-fg/80" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <h3 className="text-lg font-semibold">Find a video on YouTube</h3>
                  <p className="mt-1 text-sm text-muted">
                    Search for: &quot;{currentSubtopic.video_url.replace('search:', '')}&quot;
                  </p>
                  <a
                    href={getVideoEmbedUrl(currentSubtopic.video_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-5"
                  >
                    Search on YouTube →
                  </a>
                </div>
              ) : (
                <div className="aspect-video overflow-hidden rounded-2xl border border-line/60 bg-black shadow-card">
                  <iframe
                    src={getVideoEmbedUrl(currentSubtopic.video_url)}
                    className="h-full w-full"
                    allowFullScreen
                    title={currentSubtopic.title}
                  ></iframe>
                </div>
              )}

              <div className="card mt-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow" style={{ color: accent }}>
                      Lesson {position + 1} of {lessons.length}
                    </p>
                    <h1 className="mt-1.5 text-2xl font-bold tracking-tight">{currentSubtopic.title}</h1>
                  </div>
                  <button
                    onClick={handleToggleComplete}
                    className={currentSubtopic.completed ? 'btn-secondary !border-accent/50 !text-accent' : 'btn-primary'}
                  >
                    {currentSubtopic.completed ? (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Completed
                      </>
                    ) : (
                      'Mark as Complete'
                    )}
                  </button>
                </div>

                <p className="mt-5 whitespace-pre-line leading-relaxed text-fg/85">{currentSubtopic.content}</p>

                <div className="mt-8 flex justify-between gap-3 border-t border-line/60 pt-5">
                  <button onClick={() => goTo(-1)} disabled={position <= 0} className="btn-secondary">
                    ← Previous lesson
                  </button>
                  <button
                    onClick={() => goTo(1)}
                    disabled={position < 0 || position >= lessons.length - 1}
                    className="btn-secondary"
                  >
                    Next lesson →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card py-16 text-center text-muted">Select a lesson to start learning</div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default CoursePage;
