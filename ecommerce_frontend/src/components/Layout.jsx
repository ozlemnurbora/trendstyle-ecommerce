import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import '../App.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  
  useEffect(() => {
    if (location.pathname === '/') {
      setSearchTerm('');
    }
  }, [location.pathname]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  // HomePage'e searchTerm prop'u geç
  const enhancedChildren = React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { searchTerm })
      : child
  );

  return (
    <>
      {/* Navbar inputunu parent değerle senkronlamak için searchValue gönderiyoruz */}
      <Navbar onSearch={handleSearch} searchValue={searchTerm} />
      <div className="page-container">{enhancedChildren}</div>
    </>
  );
};

export default Layout;