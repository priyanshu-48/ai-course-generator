import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddCourse from './pages/AddCourse';
import CoursePage from './pages/CoursePage';
import Explore from './pages/Explore';
import Upgrade from './pages/Upgrade';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/add-course" element={<AddCourse />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/upgrade" element={<Upgrade />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
