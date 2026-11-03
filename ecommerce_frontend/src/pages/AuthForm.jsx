// src/pages/AuthForm.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthForm.css';
import { jwtDecode } from 'jwt-decode';

const AuthForm = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');

  // URL paramları
  const params = new URLSearchParams(location.search);
  const redirectParam = params.get('redirect');            // örn: /product/12
  const redirectSuffix = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : '';

  useEffect(() => {
    const modeFromURL = params.get('mode');
    setMode(modeFromURL === 'register' ? 'register' : 'login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const endpoint = mode === 'login' ? '/login' : '/register';
    const dataToSend = mode === 'login' ? loginData : registerData;

    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, dataToSend);

      if (mode === 'login') {
        const token = res.data.token;
        if (!token) {
          setErrorMessage('Token alınamadı!');
          return;
        }

        localStorage.setItem('token', token);
        try {
          const decoded = jwtDecode(token);
          localStorage.setItem('user', JSON.stringify(decoded));
          localStorage.setItem('username', decoded.username);
        } catch (e) {
          console.warn('JWT decode error:', e);
        }
        window.dispatchEvent(new Event('loginStatusChanged'));

        // Geldiğimiz yere dön
        navigate(redirectParam || '/');
      } else {
        alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
        navigate(`/auth?mode=login${redirectSuffix}`);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorMessage('Bu kullanıcı adı veya e-posta zaten kayıtlı.');
      } else if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error);
      } else {
        setErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
      console.error(err);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => navigate(`/auth?mode=login${redirectSuffix}`)}
        >
          Giriş Yap
        </button>
        <button
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => navigate(`/auth?mode=register${redirectSuffix}`)}
        >
          Üye Ol
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <>
            <input
              type="text"
              name="username"
              placeholder="Kullanıcı Adı"
              value={registerData.username}
              onChange={(e) => setRegisterData((p) => ({ ...p, [e.target.name]: e.target.value }))}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="E-posta"
              value={registerData.email}
              onChange={(e) => setRegisterData((p) => ({ ...p, [e.target.name]: e.target.value }))}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Şifre"
              value={registerData.password}
              onChange={(e) => setRegisterData((p) => ({ ...p, [e.target.name]: e.target.value }))}
              required
            />
          </>
        ) : (
          <>
            <input
              type="email"
              name="email"
              placeholder="E-posta"
              value={loginData.email}
              onChange={(e) => setLoginData((p) => ({ ...p, [e.target.name]: e.target.value }))}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Şifre"
              value={loginData.password}
              onChange={(e) => setLoginData((p) => ({ ...p, [e.target.name]: e.target.value }))}
              required
            />
          </>
        )}

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <button type="submit" className="submit-button">
          {mode === 'login' ? 'Giriş Yap' : 'Üye Ol'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
