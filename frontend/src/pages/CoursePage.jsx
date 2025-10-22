import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { coursesAPI } from '../utils/api';

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

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSubtopic = getCurrentSubtopic();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex">
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Progress</span>
                <span className="font-medium">{course.progress_percentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${course.progress_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-4">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.id} className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2 px-2">
                  {moduleIndex + 1}. {module.title}
                </h3>
                <div className="space-y-1">
                  {module.subtopics.map((subtopic, subtopicIndex) => (
                    <button
                      key={subtopic.id}
                      onClick={() => handleSubtopicClick(moduleIndex, subtopicIndex)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentModuleIndex === moduleIndex &&
                        currentSubtopicIndex === subtopicIndex
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-2 flex-shrink-0 ${
                            subtopic.completed
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {subtopic.completed && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="line-clamp-2">{subtopic.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentSubtopic ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  {currentSubtopic.video_url.startsWith('search:') ? (
                    <div className="aspect-video bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg flex flex-col items-center justify-center text-white p-8">
                      <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      <h3 className="text-xl font-semibold mb-2">Find Video on YouTube</h3>
                      <p className="text-center mb-4 text-primary-100">
                        Search for: "{currentSubtopic.video_url.replace('search:', '')}"
                      </p>
                      <a
                        href={getVideoEmbedUrl(currentSubtopic.video_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                      >
                        Search on YouTube →
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={getVideoEmbedUrl(currentSubtopic.video_url)}
                        className="w-full h-full"
                        allowFullScreen
                        title={currentSubtopic.title}
                      ></iframe>
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentSubtopic.title}
                    </h1>
                    <button
                      onClick={handleToggleComplete}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentSubtopic.completed
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {currentSubtopic.completed ? (
                        <span className="flex items-center">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Completed
                        </span>
                      ) : (
                        'Mark as Complete'
                      )}
                    </button>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {currentSubtopic.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a topic to start learning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;

