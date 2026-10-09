import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { coursesAPI } from '../utils/api';
import { categoryColor } from '../utils/categories';

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

const Label = ({ htmlFor, children, optional }) => (
  <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between text-sm font-medium">
    <span>{children}</span>
    {optional && <span className="text-xs font-normal text-faint">Optional</span>}
  </label>
);

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
      navigate(`/course/${response.data.id}`);
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response.data.error || 'Course limit reached');
      } else if (err.response?.status === 429) {
        setError('Too many course requests right now. Please wait a while and try again.');
      } else {
        setError(err.response?.data?.error || 'Failed to create course. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Create a new course</h1>
        <p className="mt-1 text-muted">Describe what you want to learn. The AI designs the modules, lessons and picks a video for each one.</p>

        <div className="card mt-6">
          {error && (
            <div className="alert-error mb-6" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm" role="status">
              <div className="loading-spinner flex-shrink-0" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
              <span>
                <span className="font-medium text-accent">Building your course…</span>{' '}
                <span className="text-muted">designing the curriculum and finding videos, usually 30–60 seconds.</span>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Course title</Label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g. Introduction to Deep Learning"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                  style={{ background: categoryColor(formData.category) }}
                />
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field !pl-9"
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
            </div>

            <div>
              <Label htmlFor="description">Course description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows="4"
                placeholder="Describe what this course should cover…"
                required
                disabled={loading}
              ></textarea>
              <p className="mt-2 text-xs text-muted">The more specific you are about topics and level, the better the structure.</p>
            </div>

            <div>
              <Label htmlFor="thumbnail" optional>
                Thumbnail URL
              </Label>
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

            <div className="border-t border-line/60 pt-6">
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? 'Generating course…' : 'Generate course with AI'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddCourse;
