import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';
import { Play, Eye, Calendar, User, Film, Upload } from 'lucide-react';

export default function HomePage({ onSelectVideo, onNavigateToProfile, user }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = getApiUrl();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${apiUrl}/videos`);
      if (!res.ok) throw new Error('No se pudo conectar con la API.');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setError('No se pudieron cargar los videos. Verifica que la API en EC2 esté activa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Reciente';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div>
      {/* Banner Principal */}
      <section className="hero-banner">
        <div>
          <h1 className="hero-title">Explora videos en la nube</h1>
          <p className="hero-subtitle">
            Plataforma escalable de streaming impulsada por Amazon S3, EC2 y RDS. Descubre contenido o comparte tus propios videos.
          </p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={onNavigateToProfile}>
            <Upload size={18} />
            <span>Publicar Video</span>
          </button>
        )}
      </section>

      {/* Catálogo de Videos */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700 }}>
          Videos recientes
        </h2>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          {videos.length} {videos.length === 1 ? 'video disponible' : 'videos disponibles'}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
        </div>
      ) : error ? (
        <div className="empty-state">
          <Film size={48} style={{ opacity: 0.4, marginBottom: '16px' }} />
          <p style={{ color: '#fca5a5', marginBottom: '16px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={fetchVideos}>
            Reintentar conexión
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <Film size={54} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>Aún no hay videos publicados</h3>
          <p style={{ marginTop: '8px', marginBottom: '20px' }}>
            Sé el primero en subir un video a la plataforma.
          </p>
          <button className="btn btn-primary" onClick={onNavigateToProfile}>
            Subir el primer video
          </button>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <article
              key={video.id}
              className="video-card"
              onClick={() => onSelectVideo(video.id)}
            >
              {/* Miniatura */}
              <div className="thumbnail-container">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="thumbnail-img"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="play-overlay">
                  <div className="play-icon-circle">
                    <Play size={24} fill="#fff" style={{ marginLeft: '3px' }} />
                  </div>
                </div>
              </div>

              {/* Información requerida */}
              <div className="video-info">
                <h3 className="video-title" title={video.title}>
                  {video.title}
                </h3>

                <div className="video-meta">
                  <div className="video-author">
                    <User size={14} />
                    <span>{video.user_name || 'Usuario'}</span>
                  </div>

                  <div className="video-stats">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={13} />
                      {video.views} vistas
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {formatDate(video.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
