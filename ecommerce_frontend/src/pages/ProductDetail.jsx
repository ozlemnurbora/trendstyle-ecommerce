import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaShoppingCart, FaHeart } from 'react-icons/fa';
import './ProductDetail.css';
import { requireLogin } from '../utils/auth'; 

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Varsayılan beden S 
  const [selectedSize, setSelectedSize] = useState('S'); 

  // Favoriler
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // Sepete eklerken butonu kilitler
  const [cartBusy, setCartBusy] = useState(false);       
  const [flash, setFlash] = useState('');                
  const isClothing = product?.category === 'Kıyafet';

  const lastReqId = useRef(0);
  const abortRef = useRef(null);

  const lastFavReqId = useRef(0);
  const favAbortRef = useRef(null);

  // Ürün detayı
  useEffect(() => {
    setError(null);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++lastReqId.current;

    setLoading(product === null);
    axios
      .get(`http://localhost:5000/products/${id}`, { signal: controller.signal })
      .then((res) => {
        if (reqId === lastReqId.current) {
          setProduct(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (
          err?.code === 'ERR_CANCELED' ||
          err?.name === 'CanceledError' ||
          err?.name === 'AbortError'
        ) return;
        if (reqId === lastReqId.current) {
          setError('Ürün detayı yüklenemedi. Lütfen tekrar deneyin.');
        }
      })
      .finally(() => {
        if (reqId === lastReqId.current) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Loginliyse favori durumu
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsFav(false);
      return;
    }
    if (favAbortRef.current) favAbortRef.current.abort();
    const controller = new AbortController();
    favAbortRef.current = controller;
    const reqId = ++lastFavReqId.current;

    axios
      .get('http://localhost:5000/favorites/list', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => {
        if (reqId !== lastFavReqId.current) return;
        const exists = res.data?.some?.((p) => String(p.id) === String(id));
        setIsFav(!!exists);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [id]);

  // Beden seçenekleri
  const sizeOptions = useMemo(() => {
    if (!product?.sizes) return [];
    return product.sizes.split(',').map((s) => s.trim()).filter(Boolean);
  }, [product]);

  // Ürün sizes geldiğinde varsayılan bedeni S ayarlar varsa S yoksa ilk beden
  useEffect(() => {
  if (!product) return;

  if (isClothing) {
    if (sizeOptions.length === 0) return; // beden listesi yoksa dokunma
    if (sizeOptions.includes('S')) setSelectedSize('S');
    else setSelectedSize(sizeOptions[0]);
  } else {
    setSelectedSize('STD');
  }
}, [product, isClothing, sizeOptions]);

  // Favori ekle çıkar
  const handleToggleFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/auth?mode=login&redirect=/products/${id}`);
      return;
    }
    try {
      setFavBusy(true);
      if (isFav) {
        await axios.post(
          'http://localhost:5000/favorites/remove',
          { product_id: Number(id) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFav(false);
        alert('Favorilerden çıkarıldı');
      } else {
        const { data } = await axios.post(
          'http://localhost:5000/favorites/add',
          { product_id: Number(id) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFav(true);
        alert(data?.message || 'Favorilere eklendi');
      }
    } catch (e) {
      console.error(e);
      alert('İşlem sırasında bir hata oluştu');
    } finally {
      setFavBusy(false);
    }
  };

  // Sepete ekle
  const handleAddToCart = async () => {
  if (!requireLogin(navigate)) return;

  // Gönderilecek beden
  const sizeToSend = isClothing
    ? (selectedSize || (sizeOptions.includes('S') ? 'S' : sizeOptions[0]) || 'S')
    : 'STD';

  if (!selectedSize && sizeToSend) setSelectedSize(sizeToSend);

  try {
    setCartBusy(true);
    const res = await axios.post(
      'http://localhost:5000/cart/add',
      { product_id: Number(id), size: sizeToSend, quantity: 1 },
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    const msg = res.data?.message || (res.data?.status === 'ADDED' && 'Sepete eklendi.') || 'İşlem tamamlandı.';
    setFlash(msg);
    window.dispatchEvent(new Event('cartChanged'));
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.error || 'Sepete eklenemedi.';
    setFlash(msg);
  } finally {
    setCartBusy(false);
    setTimeout(() => setFlash(''), 2000);
  }
};

  return (
    <div className="product-detail-container">
      {error && <div className="error-banner">{error}</div>}

      {loading && !product ? (
        <p className="detail-loading">Yükleniyor...</p>
      ) : !product ? (
        <p className="empty-state">Ürün bulunamadı.</p>
      ) : (
        <>
          <div className="product-image">
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              width="420"
              height="420"
            />
          </div>

          <div className="product-info">
            <h2>{product.name}</h2>
            <p><strong>Fiyat:</strong> {product.price ?? '—'} TL</p>
            {product.description && <p><strong>Açıklama:</strong> {product.description}</p>}
            {product.color && <p><strong>Renk:</strong> {product.color}</p>}
            {product.category && <p><strong>Kategori:</strong> {product.category}</p>}
            {product.fabric_type && <p><strong>Kumaş Türü:</strong> {product.fabric_type}</p>}

            {isClothing && sizeOptions.length > 0 && (
  <div className="size-selection">
    <strong>Beden Seç:</strong>
    <div className="size-buttons">
      {sizeOptions.map((size) => (
        <button
          key={size}
          onClick={() => setSelectedSize(size)}
          className={selectedSize === size ? 'selected' : ''}
        >
          {size}
        </button>
      ))}
    </div>
  </div>
)}

            <div className="action-buttons">
              <button
                className="add-to-cart"
                onClick={handleAddToCart}
                disabled={cartBusy}
                title="Sepete ekle"
              >
                <FaShoppingCart className="btn-icon" />
                {cartBusy ? 'Ekleniyor...' : 'Sepete Ekle'}
              </button>

              <button
                className="add-to-favorites"
                onClick={handleToggleFavorite}
                disabled={favBusy}
                title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              >
                <FaHeart
                  className="btn-icon"
                  style={{ color: isFav ? '#b30000' : '#003366', transition: 'color .2s' }}
                />
                {isFav ? ' Favorilerden Çıkar' : ' Favorilere Ekle'}
              </button>

              {/* kısa toast */}
              {flash && (
                <div className="toast" role="status">
                  {flash}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductDetail;