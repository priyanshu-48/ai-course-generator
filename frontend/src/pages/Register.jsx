import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', placeholder: 'Ada Lovelace', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 8 characters', autoComplete: 'new-password' },
  { name: 'passwordConfirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat your password', autoComplete: 'new-password' },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
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

    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData.email, formData.name, formData.password, formData.passwordConfirm);

      if (result.success) {
        navigate('/');
      } else if (typeof result.error === 'object') {
        setError(Object.values(result.error).flat().join(' '));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your courses and track progress across devices."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:brightness-110">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div className="alert-error mb-5" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="mb-2 block text-sm font-medium">
              {field.label}
            </label>
            <input
              type={field.type}
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              className="input-field"
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              required
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
