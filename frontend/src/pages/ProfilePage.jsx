import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';
import { Upload, Edit2, Trash2, Video, Eye, Calendar, Plus, AlertCircle, CheckCircle, X, Film } from 'lucide-react';

export default function ProfilePage({ user, onSelectVideo }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modales
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  // Estados formulario subida
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Estados formulario edición
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const apiUrl = getApiUrl();

  const fetchProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${apiUrl}/users/${user.id}`);
      if (!res.ok) throw new Error('No se pudo cargar el perfil.');
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      setError(err.message || 'Error al conectar con la API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Manejar subida de video (POST /videos)
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !thumbFile) {
      setUploadError('Debes seleccionar tanto el archivo de video (MP4) como la miniatura (JPG/PNG).');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('user_id', user.id);
    formData.append('video_file', videoFile);
    formData.append('thumbnail_file', thumbFile);

    try {
      const res = await fetch(`${apiUrl}/videos`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al subir el video.');

      setUploadSuccess('¡Video y miniatura subidos exitosamente a S3!');
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadTitle('');
        setUploadDesc('');
        setVideoFile(null);
        setThumbFile(null);
        setUploadSuccess('');
        fetchProfile();
      }, 1000);
    } catch (err) {
      setUploadError(err.message || 'Error al procesar la subida.');
    } finally {
      setUploading(false);
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (v) => {
    setEditingVideo(v);
    setEditTitle(v.title);
    setEditDesc(v.description || '');
    setEditError('');
    setShowEditModal(true);
  };

  // Manejar edición de video (PUT /videos/{id})
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setEditError('');

    try {
      const res = await fetch(`${apiUrl}/videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al actualizar video.');

      setShowEditModal(false);
      setEditingVideo(null);
      fetchProfile();
    } catch (err) {
      setEditError(err.message || 'Error al actualizar video.');
    } finally {
      setUpdating(false);
    }
  };

  // Manejar eliminación de video (DELETE /videos/{id})
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este video? Se borrará de RDS y de S3.')) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/videos/${videoId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar video.');

      fetchProfile();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el video.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header del Perfil: Información básica y estadísticas */}
      <div className="profile-header-card">
        <div className="profile-user-info">
          <div className="profile-avatar-large">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="profile-name">{user?.name}</h1>
            <p className="profile-email">{user?.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="profile-stats-card">
            <div className="stat-number">{profileData?.video_count || 0}</div>
            <div className="stat-label">Videos Publicados</div>
          </div>

          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Plus size={18} />
            <span>Publicar Nuevo Video</span>
          </button>
        </div>
      </div>

      {/* Lista y gestión de videos */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700 }}>
          Mis videos subidos
        </h2>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Total: {profileData?.videos?.length || 0}
        </span>
      </div>

      {error ? (
        <div className="alert-box alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : profileData?.videos && profileData.videos.length > 0 ? (
        <div className="user-videos-grid">
          {profileData.videos.map((vid) => (
            <div key={vid.id} className="user-video-item">
              <div
                className="thumbnail-container"
                onClick={() => onSelectVideo(vid.id)}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={vid.thumbnail_url}
                  alt={vid.title}
                  className="thumbnail-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              <div className="video-info">
                <h3
                  className="video-title"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectVideo(vid.id)}
                  title={vid.title}
                >
                  {vid.title}
                </h3>
                <div className="video-meta">
                  <div className="video-stats">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={13} />
                      {vid.views} vistas
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {formatDate(vid.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción: Editar y Eliminar */}
              <div className="user-video-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleOpenEdit(vid)}
                >
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteVideo(vid.id)}
                  title="Eliminar video"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Film size={54} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>Aún no has publicado ningún video</h3>
          <p style={{ marginTop: '8px', marginBottom: '20px' }}>
            Sube tu primer video a Amazon S3 para que aparezca aquí y en la página principal.
          </p>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Plus size={18} /> Publicar Video Ahora
          </button>
        </div>
      )}

      {/* MODAL 1: PUBLICAR VIDEO (POST /videos) */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Upload size={22} color="var(--accent-primary)" />
                <h3 className="modal-title">Publicar nuevo video</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !uploading && setShowUploadModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="alert-box alert-success">
                <CheckCircle size={18} />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label className="form-label">Título del video *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Introducción a AWS y Computación en la Nube"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Describe de qué trata tu video..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Archivo de Video (.MP4, máx 100MB) *
                </label>
                <input
                  type="file"
                  accept="video/mp4"
                  className="form-file"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Miniatura (.JPG, .JPEG, .PNG) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="form-file"
                  onChange={(e) => setThumbFile(e.target.files[0])}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px' }} />
                      <span>Subiendo a S3...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Publicar Video</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR INFORMACIÓN DEL VIDEO (PUT /videos/{id}) */}
      {showEditModal && editingVideo && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={22} color="var(--accent-primary)" />
                <h3 className="modal-title">Actualizar información del video</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !updating && setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Título del video</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input form-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={updating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px' }} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
