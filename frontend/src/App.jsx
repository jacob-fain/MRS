import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import CastSearch from './pages/CastSearch';
import Requests from './pages/Requests';
import Admin from './pages/Admin';
import MovieDetail from './pages/MovieDetail';
import PersonDetail from './pages/PersonDetail';
import Popular from './pages/Popular';
import TopRated from './pages/TopRated';
import Upcoming from './pages/Upcoming';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            <Route
              path="/search"
              element={
                <PrivateRoute>
                  <Layout>
                    <Search />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/cast-search"
              element={
                <PrivateRoute>
                  <Layout>
                    <CastSearch />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/:type/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <MovieDetail />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/person/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <PersonDetail />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/popular"
              element={
                <PrivateRoute>
                  <Layout>
                    <Popular />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/top-rated"
              element={
                <PrivateRoute>
                  <Layout>
                    <TopRated />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/upcoming"
              element={
                <PrivateRoute>
                  <Layout>
                    <Upcoming />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <PrivateRoute>
                  <Layout>
                    <Requests />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly>
                  <Layout>
                    <Admin />
                  </Layout>
                </PrivateRoute>
              }
            />
            
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
