import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './HomePage.css';
import './button.css';   

export default function Favorites() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const fetchFavs = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth?mode=login&redirect=/favorites');
      return;
    }
    axios
      .get('http://localhost:5000/favorites/list', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setItems(res.data))
      .catch((err) => console.error('Favoriler alınamadı:', err));
  }, [navigate]);

  useEffect(() => { fetchFavs(); }, [fetchFavs]);

  const removeFavorite = async (productId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:5000/favorites/remove',
        { product_id: productId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems((prev) => prev.filter((x) => x.id !== productId));
    } catch (e) {
      console.error(e);
      alert('Favorilerden çıkartılamadı');
    }
  };

  return (
    <div className="homepage">
      <h2 className="homepage-title">Favorilerim</h2>

      <div className="product-grid">
        {items.map((p) => (
          <div key={p.id} className="product-card">
            <Link to={`/products/${p.id}`}>
              <img src={p.image_url} alt={p.name} className="product-image" />
              <h3 className="product-name">{p.name}</h3>
              <p className="product-price">{Number(p.price).toFixed(2)} TL</p>
            </Link>

            {/* Ürün detay stiliyle aynı */}
            <div className="action-buttons">
  <button
  className="app-btn add-to-favorites app-btn--full"
  onClick={() => removeFavorite(p.id)}
>
  Favorilerden Çıkar
</button>
</div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="empty-state">Henüz favorin yok.</div>
        )}
      </div>
    </div>
  );
}