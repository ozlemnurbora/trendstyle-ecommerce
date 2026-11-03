import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { requireLogin } from '../utils/auth';
import './Cart.css';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  useEffect(() => {
    if (!requireLogin(navigate, '/cart')) return;

    fetchCart();

    // Başka yerden değiştiğinde sepeti güncelle
    const onChanged = () => fetchCart();
    window.addEventListener('cartChanged', onChanged);
    return () => window.removeEventListener('cartChanged', onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCart() {
    try {
      const { data } = await api.get('/cart');
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('cart fetch error:', err);
      setItems([]);
      setTotal(0);
    }
  }

  async function setQuantity(itemId, newQty) {
    if (newQty < 1) return;
    try {
      await api.patch(`/cart/item/${itemId}`, { quantity: newQty });
      fetchCart();
    } catch (err) {
      console.error('qty update error:', err);
    }
  }

  async function removeItem(itemId) {
    try {
      await api.delete(`/cart/item/${itemId}`);
      fetchCart();
    } catch (err) {
      console.error('remove error:', err);
    }
  }

  return (
    <div className="cart-wrapper">
      <h1 className="page-title">Sepetim</h1>

      <div className="cart-page">
        <div className="cart-left">
          {items.length === 0 ? (
            <p>Sepetiniz boş.</p>
          ) : (
            items.map((it) => (
              <div className="cart-row" key={it.id}>
                {/* Görsel tıklanınca ürün detayına git */}
                <Link
                  to={`/products/${it.product_id}`}
                  className="thumb"
                  aria-label={`${it.name} detayına git`}
                >
                  <img src={it.image} alt={it.name} />
                </Link>

                <div className="ci">
                  {/* Ürün adı tıklanınca ürün detayına git */}
                  <Link to={`/products/${it.product_id}`} className="t">
                    {it.name}
                  </Link>

                  <div className="m">Beden: {it.size}</div>

                  <div className="qty">
                    <button onClick={() => setQuantity(it.id, it.quantity - 1)}>-</button>
                    <input value={it.quantity} readOnly />
                    <button
                      onClick={() => setQuantity(it.id, it.quantity + 1)}
                      disabled={it.quantity >= it.size_stock}
                    >
                      +
                    </button>
                    {it.quantity >= it.size_stock && (
                      <span className="stock-note">Maks. {it.size_stock}</span>
                    )}
                  </div>
                </div>

                <div className="p">{(it.unit_price * it.quantity).toFixed(2)} TL</div>
                <button className="del" onClick={() => removeItem(it.id)}>Sil</button>
              </div>
            ))
          )}
        </div>

        <aside className="cart-right">
          <div className="summary">
            <div className="line">
              <span>Toplam</span>
              <strong>{total.toFixed(2)} TL</strong>
            </div>
            <button className="btn-primary" onClick={() => navigate('/checkout')}>
            Sepeti Onayla
           </button>
          </div>
        </aside>
      </div>
    </div>
  );
}