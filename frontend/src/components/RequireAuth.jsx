import { Navigate, useLocation } from 'react-router-dom';

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('falcon_auth') || 'null');
  } catch {
    return null;
  }
}

export function setAuth(user) {
  const prev = getAuth() || {};
  const next = {
    ...prev,
    id: user.id ?? prev.id,
    username: user.username,
    email: user.username || user.email,
    name: user.name,
    role: user.role ?? prev.role,
    avatar_url: user.avatar_url ?? null,
    at: Date.now(),
  };
  localStorage.setItem('falcon_auth', JSON.stringify(next));
  window.dispatchEvent(new Event('falcon-auth-changed'));
  return next;
}

export function clearAuth() {
  localStorage.removeItem('falcon_auth');
  window.dispatchEvent(new Event('falcon-auth-changed'));
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = getAuth();
  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
