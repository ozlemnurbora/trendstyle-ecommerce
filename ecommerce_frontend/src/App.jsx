import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthForm from './pages/AuthForm';
import ProductDetail from './pages/ProductDetail';
import Favorites from './pages/Favorites';
import Cart from './pages/Cart';
import AccountDashboard from './pages/AccountDashboard';
import AccountProfile from './pages/AccountProfile'; 
import AccountAddresses from './pages/AccountAddresses';

// yeni sayfalar
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ana sayfa */}
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />

        {/* Kategori */}
        <Route
          path="/category/:category"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />

        {/* Auth */}
        <Route
          path="/auth"
          element={
            <Layout>
              <AuthForm />
            </Layout>
          }
        />

        {/* Ürün detay */}
        <Route
          path="/products/:id"
          element={
            <Layout>
              <ProductDetail />
            </Layout>
          }
        />

        {/* Favoriler */}
        <Route
          path="/favorites"
          element={
            <Layout>
              <Favorites />
            </Layout>
          }
        />

        {/* Sepet */}
        <Route
          path="/cart"
          element={
            <Layout>
              <Cart />
            </Layout>
          }
        />

        {/* Ödeme (Checkout) */}
        <Route
          path="/checkout"
          element={
            <Layout>
              <Checkout />
            </Layout>
          }
        />

        {/* Siparişlerim */}
        <Route
          path="/orders"
          element={
            <Layout>
              <Orders />
            </Layout>
          }
        />

        {/* Hesabım */}
        <Route
          path="/account"
          element={
            <Layout>
              <AccountDashboard />
            </Layout>
          }
        />

        <Route
          path="/account/profile"
          element={
            <Layout>
              <AccountProfile />
            </Layout>
          }
        />

        <Route
          path="/account/addresses"
          element={
            <Layout>
              <AccountAddresses />
            </Layout>
          }
        />

        {/* (Opsiyonel) 404
        <Route
          path="*"
          element={
            <Layout>
              <div style={{ padding: 24 }}>Sayfa bulunamadı.</div>
            </Layout>
          }
        />
        */}
      </Routes>
    </Router>
  );
}

export default App;