import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { coursesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'AI',
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Cloud Computing',
  'Cybersecurity',
  'DevOps',
  'Blockchain',
  'Game Development',
  'Other',
];

const AddCourse = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'AI',
    thumbnail: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await coursesAPI.createCourse(formData);
      
      if (user) {
        updateUser({
          ...user,
          courses_created: user.courses_created + 1,
        });
      }

      navigate(`/course/${response.data.id}`);
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response.data.error || 'Course limit reached');
      } else {
        setError(err.response?.data?.error || 'Failed to create course. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
            <p className="text-gray-600 mt-1">
              Fill in the details and let AI generate a comprehensive course for you
            </p>
          </div>

          <div className="card">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {loading && (
              <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <div className="loading-spinner mr-3" style={{ width: '20px', height: '20px' }}></div>
                  <span>Generating your course with AI... This may take 10-30 seconds.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Introduction to Deep Learning"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={loading}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                  rows="4"
                  placeholder="Describe what this course should cover..."
                  required
                  disabled={loading}
                ></textarea>
                <p className="text-sm text-gray-500 mt-2">
                  Be specific about the topics you want to learn. The AI will use this to generate
                  your course structure.
                </p>
              </div>

              <div>
                <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  id="thumbnail"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                  disabled={loading}
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div
                        className="loading-spinner mr-3"
                        style={{ width: '20px', height: '20px', borderWidth: '2px' }}
                      ></div>
                      Generating Course...
                    </span>
                  ) : (
                    'Generate Course with AI'
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  This will use 1 of your {user?.course_limit || 3} available course slots
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCourse;




