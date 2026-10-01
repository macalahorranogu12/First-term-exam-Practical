import React, { useState } from 'react';
import { Play, User, LogIn, LogOut, Settings } from 'lucide-react';
import ApiSettingsModal from './ApiSettingsModal';

export default function Navbar({ currentPage, onNavigate, user, onLogout }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="nav-brand" onClick={() => onNavigate('home')}>
          <div className="nav-logo-icon">
            <Play size={20} fill="#fff" />
          </div>
          <span>StreamCloud</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${currentPage === 'home' ? 'primary' : ''}`}
            onClick={() => onNavigate('home')}
          >
            Principal
          </button>

          {user ? (
            <>
              <button
                className={`nav-btn ${currentPage === 'profile' ? 'primary' : ''}`}
                onClick={() => onNavigate('profile')}
              >
                <User size={18} />
                <span>{user.name.split(' ')[0]}</span>
              </button>
              <button className="nav-btn icon-only" title="Cerrar Sesión" onClick={onLogout}>
                <LogOut size={18} color="var(--danger)" />
              </button>
            </>
          ) : (
            <button
              className={`nav-btn ${currentPage === 'auth' ? 'primary' : ''}`}
              onClick={() => onNavigate('auth')}
            >
              <LogIn size={18} />
              <span>Acceder</span>
            </button>
          )}

          <button
            className="nav-btn icon-only"
            title="Configurar servidor API"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={18} />
          </button>
        </nav>
      </header>

      <ApiSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
