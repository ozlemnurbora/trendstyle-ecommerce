export function requireLogin(navigate, nextPath) {
  const token = localStorage.getItem('token');
  if (!token) {
    const redirect = encodeURIComponent(
      nextPath || (window.location.pathname + window.location.search)
    );
    navigate(`/auth?mode=login&redirect=${redirect}`);
    return false;
  }
  return true;
}