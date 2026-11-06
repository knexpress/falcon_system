import { Navigate, useLocation } from 'react-router-dom';

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('falcon_auth') || 'null');
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem('falcon_auth');
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = getAuth();
  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
