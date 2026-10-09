import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-3.5 ${
    isActive ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel hover:text-fg'
  }`;

export const Logo = ({ size = 32 }) => (
  <span
    className="inline-flex items-center justify-center rounded-lg bg-accent text-ink"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M3 6.5c2.6-1 5.4-.6 9 1.2 3.6-1.800 6.400-2.200 9-1.200V19c-2.600-1-5.400-.6-9 1.200C8.400 18.400 5.600 18 3 19z" />
      <path d="M12 7.700v12.500" />
    </svg>
  </span>
);

const Layout = ({ children, wide = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/50 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">AI Course Gen</span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="Main">
              <NavLink to="/" end className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/add-course" className={navClass}>
                New course
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-2 text-muted md:flex">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(76,211,221,0.8)]" />
              Live demo
            </span>
            {isAuthenticated ? (
              <>
                <span className="hidden max-w-[12rem] truncate text-muted lg:inline">{user?.email}</span>
                <button onClick={handleLogout} className="btn-secondary whitespace-nowrap !px-3 !py-2 sm:!px-3.5">
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary whitespace-nowrap !px-3 !py-2 sm:!px-3.5">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 sm:px-6 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>{children}</main>
    </div>
  );
};

export default Layout;
