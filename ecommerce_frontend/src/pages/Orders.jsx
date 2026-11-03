import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [username, setUsername] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    // siparişler
    axios
      .get('http://localhost:5000/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrders([]));

    // alıcı adı 
    axios
      .get('http://localhost:5000/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setUsername(r.data?.username || ''))
      .catch(() => {});
  }, [token]);

  const fmtTL = (n) => `${Number(n || 0).toFixed(2)} TL`;
  
  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };
  const countItems = (items = []) =>
    items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

  return (
    <div className="orders2-wrap">
      <h1 className="orders2-title">Siparişlerim</h1>

      {orders.length === 0 ? (
        <div className="orders2-empty">Henüz siparişiniz yok.</div>
      ) : (
        orders.map((o) => (
          <div className="order2-card" key={o.id}>
            {/* Üst başlık satırı */}
            <div className="o2-head">
              <div>
                <div className="o2-head-k">Sipariş tarihi</div>
                <div className="o2-head-v">{fmtDate(o.created_at)}</div>
              </div>
              <div>
                <div className="o2-head-k">Sipariş özeti</div>
                <div className="o2-head-v">1 Teslimat, {countItems(o.items)} Ürün</div>
              </div>
              <div className="o2-hide-sm">
                <div className="o2-head-k">Alıcı</div>
                <div className="o2-head-v">{username || '—'}</div>
              </div>
              <div className="o2-total">
                <div className="o2-head-k">Toplam</div>
                <div className="o2-price">{fmtTL(o.total)}</div>
              </div>
            </div>

            {/* Alt içerik */}
            <div className="o2-body">
              {o.status && (
                <div className="o2-status">
                  <span className={`o2-badge s-${(o.status || '').toLowerCase()}`}>{o.status}</span>
                </div>
              )}

              <div className="o2-items">
                {(o.items || []).map((it, idx) => (
                  <div className="o2-item" key={idx}>
                    <div className="o2-item-name">{it.name}</div>
                    <div className="o2-item-meta">
                      {it.size} x {it.quantity}
                    </div>
                    <div className="o2-item-price">{fmtTL(it.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}