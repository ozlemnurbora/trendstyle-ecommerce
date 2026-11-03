import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './HomePage.css';
import { useNavigate, useParams } from 'react-router-dom';

const HomePage = ({ searchTerm = '' }) => {
  const navigate = useNavigate();
  const { category } = useParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  
  const lastReqId = useRef(0);
  
  const abortRef = useRef(null);

  
  const STORAGE_KEY = category ? `products:${category}` : 'products:all';

  useEffect(() => {
    setError(null);

    
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setProducts(parsed);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
    } catch {
      setLoading(true);
    }

    
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++lastReqId.current;

    const url = category
      ? `http://localhost:5000/products?category=${encodeURIComponent(category)}`
      : `http://localhost:5000/products`;

    axios
      .get(url, { signal: controller.signal })
      .then(res => {
        if (reqId === lastReqId.current) {
          setProducts(res.data);
          setError(null);
          
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.data)); } catch {}
        }
      })
      .catch(err => {
        if (
          err?.code === 'ERR_CANCELED' ||
          err?.name === 'CanceledError' ||
          err?.name === 'AbortError'
        ) return;
        if (reqId === lastReqId.current) {
          
          setError('Ürünler yüklenemedi. Lütfen tekrar deneyin.');
        }
      })
      .finally(() => {
        if (reqId === lastReqId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [category, STORAGE_KEY]);

  const norm = (s) => (s || '').toLocaleLowerCase('tr');

  const filtered = useMemo(() => {
    const q = norm(searchTerm).trim();
    if (!q) return products;
    return products.filter(p =>
      norm(p.name).includes(q) ||
      norm(p.description || '').includes(q) ||
      norm(p.category || '').includes(q)
    );
  }, [products, searchTerm]);

  // Seri tıklamayı kilitler
  const navigatingRef = useRef(false);
  const handleProductClick = (id) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navigate(`/products/${id}`);
    setTimeout(() => { navigatingRef.current = false; }, 500);
  };

  const titleSuffix = (searchTerm && searchTerm.trim())
    ? ` — “${searchTerm}”`
    : '';

  return (
    <div className="homepage">
      <h2 className="homepage-title">
        {category ? `${category} Ürünleri` : 'Ürünler'}{titleSuffix}
      </h2>

      {error && <div className="error-banner">{error}</div>}

      {loading && products.length === 0 ? (
        <div className="page-loading">Yükleniyor...</div>
      ) : error && products.length === 0 ? (
        
        null
      ) : filtered.length === 0 ? (
        <div className="empty-state">Sonuç bulunamadı.</div>
      ) : (
        <div className="product-grid">
          {filtered.map(product => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleProductClick(product.id)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={product.image_url}
                alt={product.name}
                className="product-image"
                loading="lazy"
                width="320" height="320"
              />
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">
                {product.price && !isNaN(product.price)
                  ? Number(product.price).toFixed(2) + ' TL'
                  : 'Fiyat yok'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;