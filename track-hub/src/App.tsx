import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import HabitTracker from './pages/HabitTracker';
import StudyTracker from './pages/StudyTracker';
import FinanceTracker from './pages/FinanceTracker';
import TemplatesMarketplace from './pages/TemplatesMarketplace';
import MyFiles from './pages/MyFiles';
import MyNotes from './pages/MyNotes';
import TeamMembers from './pages/TeamMembers';
import Login from './pages/Login';
import Profile from './pages/Profile';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  
  if (user && !user.emailVerified) {
    return <Navigate to="/login" state={{ unverified: true, email: user.email }} />;
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/habits" element={<PrivateRoute><HabitTracker /></PrivateRoute>} />
          <Route path="/study" element={<PrivateRoute><StudyTracker /></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute><FinanceTracker /></PrivateRoute>} />
          <Route path="/files" element={<PrivateRoute><MyFiles /></PrivateRoute>} />
          <Route path="/notes" element={<PrivateRoute><MyNotes /></PrivateRoute>} />
          <Route path="/team" element={<PrivateRoute><TeamMembers /></PrivateRoute>} />
          <Route path="/templates" element={<PrivateRoute><TemplatesMarketplace /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
