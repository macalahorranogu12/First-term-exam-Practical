import React, { useState } from 'react';
import { getApiUrl } from '../config';
import { LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiUrl = getApiUrl();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Iniciar Sesión (POST /login)
        const response = await fetch(`${apiUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Error al iniciar sesión.');
        }

        setSuccess('¡Inicio de sesión exitoso!');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        // Registro de Cuenta (POST /users)
        const response = await fetch(`${apiUrl}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Error al crear la cuenta.');
        }

        setSuccess('Cuenta creada correctamente. Iniciando sesión...');
        // Iniciar sesión automáticamente
        setTimeout(async () => {
          try {
            const loginRes = await fetch(`${apiUrl}/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.email,
                password: formData.password
              })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
              onLoginSuccess(loginData.user);
            } else {
              setIsLogin(true);
            }
          } catch {
            setIsLogin(true);
          }
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            {isLogin ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
          </h2>
          <p className="auth-subtitle">
            {isLogin
              ? 'Ingresa tus credenciales para acceder a la plataforma'
              : 'Regístrate para subir y compartir tus videos en AWS'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
          >
            Registrarse
          </button>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-box alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Ej. Martin Calahorrano"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" />
            ) : isLogin ? (
              <>
                <LogIn size={18} />
                <span>Ingresar</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Registrar cuenta</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
