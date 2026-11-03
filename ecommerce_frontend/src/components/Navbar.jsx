import React, { useEffect, useState } from 'react';
import './Navbar.css';
import { FaHeart, FaShoppingCart, FaUser, FaSearch } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { requireLogin } from '../utils/auth'; 

const Navbar = ({ onSearch, searchValue = '' }) => {
  const [user, setUser] = useState(localStorage.getItem('username'));
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleLoginStatusChange = () => {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      setUser(token && username ? username : null);
    };
    window.addEventListener('loginStatusChanged', handleLoginStatusChange);
    return () => window.removeEventListener('loginStatusChanged', handleLoginStatusChange);
  }, []);

  useEffect(() => {
    setQ(searchValue || '');
  }, [searchValue]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
    window.dispatchEvent(new Event('loginStatusChanged'));
    clearAndGo('/');
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const query = q.trim();
    onSearch?.(query);
    navigate('/');
  };

  const clearAndGo = (to) => {
    onSearch?.('');
    setQ('');
    navigate(to);
  };

  // Favoriler: login kontrolü + redirect
  const handleFavoritesClick = (e) => {
    e.preventDefault();
    if (!requireLogin(navigate, '/favorites')) return; // login yoksa auth'a yönlendirilir
    clearAndGo('/favorites');                           // loginli ise favorilere git
  };

  // Sepet: login kontrolü + redirect
  const handleCartClick = (e) => {
    e.preventDefault();
    if (!requireLogin(navigate, '/cart')) return;       // login yoksa auth'a yönlendirilir
    clearAndGo('/cart');                                 // loginli ise sepete git
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo" onClick={() => clearAndGo('/')}>TrendStyle</span>
        <span className="navbar-link" onClick={() => clearAndGo('/')}>Ana Sayfa</span>

        {/* Kategoriler */}
        <div className="dropdown">
          <div className="dropdown-toggle navbar-link">Kategoriler</div>
          <div className="dropdown-content">
            <button type="button" className="dropdown-item" onClick={() => clearAndGo('/')}>Tümü</button>
            <button type="button" className="dropdown-item" onClick={() => clearAndGo('/category/Kıyafet')}>Kıyafet</button>
            <button type="button" className="dropdown-item" onClick={() => clearAndGo('/category/Çanta')}>Çanta</button>
            <button type="button" className="dropdown-item" onClick={() => clearAndGo('/category/Takı')}>Takı</button>
          </div>
        </div>
      </div>

      {/* Arama */}
      <form className="search-box" onSubmit={submitSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Ürün ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="search-submit" aria-label="Ara">
          <FaSearch className="search-icon" />
        </button>
      </form>

      <div className="navbar-right">
  {user ? (
    <div className="dropdown">
      <div className="dropdown-toggle" onClick={() => navigate('/account')}>
    <FaUser className="icon" />
    <span>Hesabım</span>
    </div>
      <div className="dropdown-content">
        {/* Kullanıcı adına tıklayınca /account sayfasına yönlendirir */}
        <Link to="/account" className="dropdown-item" onClick={() => onSearch?.('')}>
          {user}
        </Link>

        {/* Çıkış Yap */}
        <button onClick={handleLogout} className="dropdown-item logout">
          Çıkış Yap
        </button>
      </div>
    </div>
  ) : (
    <div className="dropdown">
      <div className="dropdown-toggle">
        <FaUser className="icon" />
        <span>Giriş</span>
      </div>
      <div className="dropdown-content">
        <Link to={`/auth?mode=login`} className="dropdown-item" onClick={() => onSearch?.('')}>
          Giriş Yap
        </Link>
        <Link to={`/auth?mode=register`} className="dropdown-item" onClick={() => onSearch?.('')}>
          Üye Ol
        </Link>
      </div>
    </div>
    )}

        {/* Favoriler */}
        <a href="/favorites" onClick={handleFavoritesClick}>
          <FaHeart className="icon" /> Favoriler
        </a>

        {/* Sepet */}
        <a href="/cart" onClick={handleCartClick}>
          <FaShoppingCart className="icon" /> Sepet
        </a>
      </div>
    </nav>
  );
};

export default Navbar;