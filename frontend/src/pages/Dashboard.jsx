import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { coursesAPI, authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [backendAwake, setBackendAwake] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    const wakeBackend = async () => {
      try {
        await fetch('https://ai-course-generator-emo8.onrender.com/ping/', {
          mode: 'no-cors',
        });
      } catch (err) {
        console.error('Backend ping failed:', err);
      } finally {
        setTimeout(() => setBackendAwake(true), 1000); 
      }
    };

    wakeBackend();
  }, []);

  useEffect(() => {
  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.listCourses();
      console.log("Fetched courses:", response.data);
      setCourses(response.data);
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  fetchCourses();
}, []);


  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      await coursesAPI.deleteCourse(courseId);
      setCourses(courses.filter((course) => course.id !== courseId));
      const userResponse = await authAPI.getProfile();
      updateUser(userResponse.data);
    } catch (err) {
      alert('Failed to delete course');
    }
  };

  useEffect(() => {
    const seen = localStorage.getItem('demoPopupSeen');
    if (!seen) {
      setShowPopup(true);
      localStorage.setItem('demoPopupSeen', 'true');
    }
  }, []);

  if (!backendAwake) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-gray-50">
        <p className="text-lg font-medium">⚙️ Waking up backend server...</p>
        <p className="text-sm text-gray-500 mt-2">
          This may take 15–30 seconds on free hosting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
              <p className="text-gray-600 mt-1">
                Manage and track your learning journey
              </p>
            </div>
            <Link
              to="/add-course"
              className="btn-primary flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Course</span>
            </Link>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No courses yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI-generated course to start learning!
            </p>
            <Link
              to="/add-course"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create Your First Course</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="card hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
              >
                <div onClick={() => navigate(`/course/${course.id}`)}>
                  <div className="w-full h-40 bg-gradient-to-br from-primary-400 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-white opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {course.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>Progress</span>
                      <span className="font-medium">
                        {course.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{
                          width: `${course.progress_percentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Continue Learning →
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course.id);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Welcome to the Demo!
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Start by clicking the <strong>Add Course</strong> button to
              generate your first AI-powered course.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
