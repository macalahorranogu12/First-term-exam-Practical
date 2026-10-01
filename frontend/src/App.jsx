import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import PlayerPage from './pages/PlayerPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stream_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sincronización básica con el hash de la URL para S3
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      if (hash.startsWith('watch')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const id = params.get('id');
        if (id) {
          setCurrentVideoId(Number(id));
          setCurrentPage('player');
          return;
        }
      }
      if (['home', 'auth', 'profile'].includes(hash)) {
        setCurrentPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page, videoId = null) => {
    setCurrentPage(page);
    if (page === 'player' && videoId) {
      setCurrentVideoId(videoId);
      window.location.hash = `watch?id=${videoId}`;
    } else {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('stream_user', JSON.stringify(userData));
    navigateTo('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('stream_user');
    navigateTo('home');
  };

  return (
    <div className="app-container">
      {/* Header común con logo y navegación */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        user={user}
        onLogout={handleLogout}
      />

      {/* Contenido principal según la página activa */}
      <main className="main-content">
        {currentPage === 'home' && (
          <HomePage
            onSelectVideo={(id) => navigateTo('player', id)}
            onNavigateToProfile={() => navigateTo(user ? 'profile' : 'auth')}
            user={user}
          />
        )}

        {currentPage === 'auth' && (
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        )}

        {currentPage === 'player' && (
          <PlayerPage
            videoId={currentVideoId}
            onSelectVideo={(id) => navigateTo('player', id)}
            user={user}
            onRequireAuth={() => navigateTo('auth')}
          />
        )}

        {currentPage === 'profile' && (
          user ? (
            <ProfilePage
              user={user}
              onSelectVideo={(id) => navigateTo('player', id)}
            />
          ) : (
            <AuthPage onLoginSuccess={handleLoginSuccess} />
          )
        )}
      </main>

      {/* Footer elegante */}
      <footer style={{
        textAlign: 'center',
        padding: '30px 20px',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-dim)',
        fontSize: '0.85rem'
      }}>
        <p>Plataforma de Videos • AWS Cloud Architecture (React SPA + FastAPI en EC2 + Amazon RDS + S3)</p>
      </footer>
    </div>
  );
}
