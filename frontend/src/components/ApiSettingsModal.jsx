import React, { useState } from 'react';
import { getApiUrl, setApiUrl } from '../config';
import { Server, Check, X } from 'lucide-react';

export default function ApiSettingsModal({ isOpen, onClose }) {
  const [url, setUrl] = useState(getApiUrl());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setApiUrl(url);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload();
    }, 800);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={22} color="var(--accent-primary)" />
            <h3 className="modal-title">Configuración de la API (EC2)</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">URL del Backend FastAPI</label>
            <input
              type="text"
              className="form-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://<IP_PUBLICA_EC2>:8000"
              required
            />
            <small style={{ color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
              Ingresa la IP pública de tu EC2 en el puerto 8000 (ej: <code>http://54.210.12.34:8000</code>).
            </small>
          </div>

          {saved && (
            <div className="alert-box alert-success">
              <Check size={18} /> URL guardada exitosamente. Recargando...
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar y Conectar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
