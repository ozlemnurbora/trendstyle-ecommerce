import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Checkout.css';

export default function Checkout() {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [cartSummary, setCartSummary] = useState({ total: 0, items: [] });
  const [username, setUsername] = useState('');

  const [card, setCard] = useState({
    name: '',
    number: '',
    expMonth: '',
    expYear: '',
    cvv: '',
  });

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchInit = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/checkout/init', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const addrs = res.data.addresses || [];
      setAddresses(addrs);
      if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
      setCartSummary(res.data.cart || { total: 0, items: [] });

      if (res.data.username) {
        setUsername(res.data.username);
      } else {
        
        try {
          const r2 = await axios.get('http://localhost:5000/addresses', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUsername(r2.data?.username || '');
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  

  useEffect(() => {
    fetchInit();
  }, [fetchInit]);

  useEffect(() => {
    const onFocus = () => fetchInit();
    const onPageShow = (e) => { if (e.persisted) fetchInit(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [fetchInit]);

  const allFieldsFilled = () => {
    const hasAddress = selectedAddressId !== null && selectedAddressId !== undefined;
    const ok =
      hasAddress &&
      card.name.trim() &&
      card.number.trim() &&
      card.expMonth.trim() &&
      card.expYear.trim() &&
      card.cvv.trim();
    return Boolean(ok);
  };

  const handlePay = async () => {
    if (!allFieldsFilled()) {
      alert('Lütfen tüm gerekli bilgileri giriniz.');
      return;
    }
    try {
      const res = await axios.post(
        'http://localhost:5000/checkout/confirm',
        {
          addressId: selectedAddressId,
          card, 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.status === 'OK') {
        alert('Siparişiniz alındı.');
        window.dispatchEvent(new Event('cartChanged'));
        window.location.href = '/orders';
      } else {
        alert(res.data?.error || 'Ödeme sırasında bir sorun oluştu.');
      }
    } catch (e) {
      console.error(e);
      alert('Ödeme sırasında bir sorun oluştu.');
    }
  };

  if (loading) return <div className="checkout-wrap">Yükleniyor...</div>;


  return (
    <div className="checkout-wrap">
      {/* Sol içerik */}
      <div className="checkout-left">
        {/* Adres Bloğu */}
        <div className="card">
          <div className="card-title">Adrese Teslim Edilsin</div>

          {addresses.length === 0 ? (
            <div className="empty-address">
              <div>Lütfen adres giriniz.</div>
              <button
                className="btn-light"
                onClick={() => navigate('/account/addresses')}
              >
                Adres Ekle / Değiştir
              </button>
            </div>
          ) : (
            <>
              {/* Birden fazla adres varsa seçim */}
              {addresses.length > 1 && (
                <select
                  className="select"
                  value={selectedAddressId ?? ''}
                  onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {`${a.address_text} — ${a.city}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Seçili adres */}
              {(() => {
                const sel =
                  addresses.find((a) => a.id === selectedAddressId) ||
                  addresses[0] ||
                  null;
                return sel ? (
                  <div className="addr-preview">
                    <div className="addr-row">
                      <span className="k">Kullanıcı Adı:</span>
                      <span className="v">{username || '—'}</span>
                    </div>
                    <div className="addr-row">
                      <span className="k">Fatura Türü:</span>
                      <span className="v">{sel.invoice_type}</span>
                    </div>
                    <div className="addr-row">
                      <span className="k">Açık Adres:</span>
                      <span className="v">{sel.address_text}</span>
                    </div>
                    <div className="addr-row">
                      <span className="k">Şehir:</span>
                      <span className="v">{sel.city}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div>
                <button
                  className="btn-light mt8"
                  onClick={() => navigate('/account/addresses')}
                >
                  Adres Ekle / Değiştir
                </button>
              </div>
            </>
          )}
        </div>

        {/* Ödeme Seçenekleri */}
        <div className="card">
          <div className="card-title">Ödeme Seçenekleri</div>

          <div className="form-grid">
            <label>
              Kart Üzerindeki İsim
              <input
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                placeholder="Ad Soyad"
              />
            </label>

            <label>
              Kart Numarası
              <input
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                maxLength={19}
              />
            </label>

            <div className="row">
              <label style={{ flex: 1 }}>
                Son Kullanma (Ay)
                <input
                  value={card.expMonth}
                  onChange={(e) => setCard({ ...card, expMonth: e.target.value })}
                  placeholder="AA"
                  inputMode="numeric"
                  maxLength={2}
                />
              </label>
              <label style={{ flex: 1 }}>
                Son Kullanma (Yıl)
                <input
                  value={card.expYear}
                  onChange={(e) => setCard({ ...card, expYear: e.target.value })}
                  placeholder="YY"
                  inputMode="numeric"
                  maxLength={2}
                />
              </label>
              <label style={{ flex: 1 }}>
                CVV
                <input
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  placeholder="***"
                  inputMode="numeric"
                  maxLength={4}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ */}
      <div className="checkout-right">
        <div className="summary-card">
          <div className="summary-row head">Sipariş Özeti</div>
          <div className="summary-row">
            <span>Ürünlerin Toplamı</span>
            <span>{cartSummary.total.toFixed(2)} TL</span>
          </div>
          <div className="summary-row">
            <span>Kargo</span>
            <span>{cartSummary.total > 0 ? '0.00 TL' : '0.00 TL'}</span>
          </div>
          <div className="summary-row total">
            <span>Toplam</span>
            <span>{cartSummary.total.toFixed(2)} TL</span>
          </div>

          <button
            className="btn-pay"
            disabled={!allFieldsFilled()}
            onClick={handlePay}
            title={!allFieldsFilled() ? 'Lütfen tüm gerekli bilgileri giriniz.' : 'Ödeme Yap'}
          >
            Ödeme Yap
          </button>
        </div>
      </div>
    </div>
  );
}