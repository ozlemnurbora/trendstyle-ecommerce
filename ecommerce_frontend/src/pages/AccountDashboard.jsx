import { useNavigate } from 'react-router-dom';
import './AccountDashboard.css';

export default function AccountDashboard() {
  const navigate = useNavigate();

  return (
    <div className="account-page">
      <div className="account-hero">
        <div>
          <h1>Hesabım</h1>
          <p>Profil ve sipariş ayarlarını buradan yönet.</p>
        </div>
      </div>

      <div className="account-grid">
        <button className="account-card" onClick={() => navigate('/account/profile')}>
          <div className="card-icon">👤</div>
          <div className="card-title">Kullanıcı Bilgilerim</div>
          <div className="card-desc">Ad, e-posta, şifre vb.</div>
        </button>

        <button className="account-card" onClick={() => navigate('/account/addresses')}>
          <div className="card-icon">📍</div>
          <div className="card-title">Adreslerim</div>
          <div className="card-desc">Teslimat / fatura adresleri</div>
        </button>

        <button className="account-card" onClick={() => navigate('/orders')}>
          <div className="card-icon">🧾</div>
          <div className="card-title">Siparişlerim</div>
          <div className="card-desc">Geçmiş ve aktif siparişler</div>
        </button>
      </div>
    </div>
  );
}