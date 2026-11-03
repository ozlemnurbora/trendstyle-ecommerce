import { useEffect, useState } from 'react';
import axios from 'axios';
import './AccountProfile.css';

export default function AccountProfile() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
  });

  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  const [msg, setMsg] = useState(null);
  const token = localStorage.getItem('token');

  // Profil bilgilerini çek
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get('http://localhost:5000/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (cancelled) return;
      setProfile({
        username: res.data?.username || '',
        email: res.data?.email || '',
      });
      setLoading(false);
    })
    .catch(err => {
      if (cancelled) return;
      setMsg(err?.response?.data?.error || 'Profil bilgileri getirilemedi.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSavingProfile(true);
    try {
      const res = await axios.put('http://localhost:5000/me',
        { username: profile.username, email: profile.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Başarılıysa 
      if (profile.username) {
        try { localStorage.setItem('username', profile.username); } catch {}
        window.dispatchEvent(new Event('loginStatusChanged'));
      }
      setMsg(res.data?.message || 'Profil güncellendi.');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Profil güncellenemedi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (passForm.new_password !== passForm.new_password_confirm) {
      setMsg('Yeni şifreler eşleşmiyor.');
      return;
    }
    setSavingPass(true);
    try {
      const res = await axios.put('http://localhost:5000/me/password',
        {
          current_password: passForm.current_password,
          new_password: passForm.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(res.data?.message || 'Şifre güncellendi.');
      setPassForm({ current_password: '', new_password: '', new_password_confirm: '' });
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Şifre güncellenemedi.');
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return <div className="account-profile page-wrap">Yükleniyor...</div>;
  }

  return (
    <div className="account-profile page-wrap">
      <h1>Kişisel Bilgiler</h1>
      <p className="page-sub">Kullanıcı bilgilerini ve şifreni buradan güncelleyebilirsin.</p>

      {msg && <div className="alert">{msg}</div>}

      <div className="grid-2">
        {/* Sol: Kullanıcı adı & email */}
        <form className="card" onSubmit={updateProfile}>
          <h2>Profil Bilgileri</h2>
          <label>
            Kullanıcı Adı
            <input
              type="text"
              value={profile.username}
              onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              required
            />
          </label>

          <button type="submit" className="btn" disabled={savingProfile}>
            {savingProfile ? 'Güncelleniyor…' : 'Güncelle'}
          </button>
        </form>

        {/* Şifre değiştir */}
        <form className="card" onSubmit={updatePassword}>
          <h2>Şifre Bilgilerim</h2>

          <label>
            Mevcut Şifre
            <input
              type="password"
              value={passForm.current_password}
              onChange={e => setPassForm(f => ({ ...f, current_password: e.target.value }))}
              required
            />
          </label>

          <label>
            Yeni Şifre
            <input
              type="password"
              value={passForm.new_password}
              onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
              required
              minLength={6}
            />
          </label>

          <label>
            Yeni Şifre (Tekrar)
            <input
              type="password"
              value={passForm.new_password_confirm}
              onChange={e => setPassForm(f => ({ ...f, new_password_confirm: e.target.value }))}
              required
              minLength={6}
            />
          </label>

          <button type="submit" className="btn" disabled={savingPass}>
            {savingPass ? 'Güncelleniyor…' : 'Güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}