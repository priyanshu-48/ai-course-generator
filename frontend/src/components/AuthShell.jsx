import { Link } from 'react-router-dom';
import { Logo } from './Layout';

// Shared dark card layout for the sign-in and register pages.
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
    <Link to="/" className="mb-8 flex items-center gap-3">
      <Logo size={40} />
      <span className="text-xl font-semibold tracking-tight">AI Course Gen</span>
    </Link>
    <div className="card w-full max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
    <p className="mt-6 text-sm text-muted">{footer}</p>
  </div>
);

export default AuthShell;
