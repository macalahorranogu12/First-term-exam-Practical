import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';
import { Eye, Calendar, User, MessageSquare, Send, Sparkles, AlertCircle } from 'lucide-react';

export default function PlayerPage({ videoId, onSelectVideo, user, onRequireAuth }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const apiUrl = getApiUrl();

  const fetchVideoDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${apiUrl}/videos/${videoId}`);
      if (!res.ok) throw new Error('Video no encontrado o error en el servidor.');
      const data = await res.json();
      setVideo(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el reproductor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchVideoDetails();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [videoId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    setCommentError('');

    try {
      const res = await fetch(`${apiUrl}/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText.trim(),
          user_id: user.id
        })
      });

      const newComment = await res.json();
      if (!res.ok) throw new Error(newComment.detail || 'Error al publicar comentario.');

      // Actualizar comentarios en la UI
      setVideo((prev) => ({
        ...prev,
        comments: [newComment, ...(prev.comments || [])]
      }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.message || 'Error al enviar el comentario.');
    } finally {
      setSubmittingComment(false);
    }
  };

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
        <div className="spinner" style={{ width: '45px', height: '45px' }} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="empty-state">
        <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
        <h2>Error al reproducir el video</h2>
        <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>{error}</p>
        <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={fetchVideoDetails}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="player-layout">
      {/* Columna Principal: Reproductor, Info y Comentarios */}
      <div className="player-main-column">
        {/* Elemento de Video */}
        <div className="video-player-container">
          <video
            key={video.video_url}
            className="video-element"
            controls
            autoPlay
            playsInline
            poster={video.thumbnail_url}
          >
            <source src={video.video_url} type="video/mp4" />
            Tu navegador no soporta la reproducción de video HTML5.
          </video>
        </div>

        {/* Detalles del video */}
        <div className="player-details">
          <h1 className="player-title">{video.title}</h1>

          <div className="player-author-bar">
            <div className="author-badge">
              <div className="author-avatar">
                {(video.user_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="author-name">{video.user_name || 'Creador desconocido'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Publicado en StreamCloud</div>
              </div>
            </div>

            <div className="player-stats-badge">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={15} />
                <strong>{video.views}</strong> vistas
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} />
                {formatDate(video.created_at)}
              </span>
            </div>
          </div>

          {/* Descripción */}
          {video.description && (
            <div className="player-desc-box">
              {video.description}
            </div>
          )}
        </div>

        {/* Sección de Comentarios */}
        <div className="comments-section">
          <h3 className="comments-header">
            <MessageSquare size={20} color="var(--accent-primary)" />
            <span>Comentarios ({video.comments?.length || 0})</span>
          </h3>

          {/* Formulario para agregar comentario */}
          <form onSubmit={handleAddComment} className="comment-input-card">
            <input
              type="text"
              className="form-input"
              placeholder={user ? "Escribe un comentario público..." : "Inicia sesión para comentar"}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!user || submittingComment}
            />
            {user ? (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingComment || !commentText.trim()}
              >
                {submittingComment ? <div className="spinner" style={{ width: '18px', height: '18px' }} /> : <Send size={18} />}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onRequireAuth}>
                Acceder
              </button>
            )}
          </form>

          {commentError && (
            <div className="alert-box alert-error" style={{ marginBottom: '16px' }}>
              <span>{commentError}</span>
            </div>
          )}

          {/* Lista de comentarios */}
          <div className="comment-list">
            {video.comments && video.comments.length > 0 ? (
              video.comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="author-avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                    {(comment.user_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="comment-content">
                    <div className="comment-author">
                      <span>{comment.user_name || 'Usuario'}</span>
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                No hay comentarios aún. ¡Sé el primero en opinar!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Columna Lateral: Videos Recomendados cargados dinámicamente desde la API */}
      <aside className="recommended-sidebar">
        <h3 className="recommended-title">
          <Sparkles size={18} color="#ec4899" />
          <span>Videos recomendados</span>
        </h3>

        {video.recommended_videos && video.recommended_videos.length > 0 ? (
          video.recommended_videos.map((rec) => (
            <div
              key={rec.id}
              className="recommended-card"
              onClick={() => onSelectVideo(rec.id)}
            >
              <img
                src={rec.thumbnail_url}
                alt={rec.title}
                className="recommended-thumb"
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
                }}
              />
              <div className="recommended-info">
                <h4 className="recommended-video-title" title={rec.title}>
                  {rec.title}
                </h4>
                <span className="recommended-video-author">{rec.user_name || 'Creador'}</span>
                <span className="recommended-video-views">{rec.views} vistas</span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', padding: '12px 0' }}>
            No hay más videos para recomendar por ahora.
          </p>
        )}
      </aside>
    </div>
  );
}
