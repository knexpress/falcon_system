import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { clearAuth, getAuth, setAuth } from './RequireAuth.jsx';

function initialsFrom(name) {
  return String(name || 'FR')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function fileToAvatarDataUrl(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, or WebP).');
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('Image must be under 4 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

function Avatar({ auth, className = 'workspace-avatar' }) {
  if (auth?.avatar_url) {
    return (
      <img
        className={`${className} has-photo`}
        src={auth.avatar_url}
        alt=""
      />
    );
  }
  return (
    <div className={className} aria-hidden="true">
      {initialsFrom(auth?.name)}
    </div>
  );
}

export default function ProfileMenu({ onLogout }) {
  const [auth, setAuthState] = useState(() => getAuth());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    username: '',
    current_password: '',
    password: '',
    avatar_url: null,
  });
  const rootRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    function sync() {
      setAuthState(getAuth());
    }
    window.addEventListener('falcon-auth-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('falcon-auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openEditor() {
    const current = getAuth();
    setForm({
      name: current?.name || '',
      username: current?.username || current?.email || '',
      current_password: '',
      password: '',
      avatar_url: current?.avatar_url || null,
    });
    setError('');
    setEditing(true);
    setOpen(false);
  }

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        avatar_url: form.avatar_url,
      };
      if (form.password) {
        body.password = form.password;
        body.current_password = form.current_password;
      }
      const updated = await api.updateProfile(body);
      const next = setAuth(updated);
      setAuthState(next);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    setOpen(false);
    clearAuth();
    onLogout?.();
  }

  const roleLabel = auth?.role === 'owner' ? 'Owner' : 'Staff';

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="workspace-user workspace-user-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="workspace-user-text">
          <strong>{auth?.name || 'Staff'}</strong>
          <span>{roleLabel}</span>
        </div>
        <Avatar auth={auth} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-head">
            <Avatar auth={auth} className="workspace-avatar profile-dropdown-avatar" />
            <div>
              <strong>{auth?.name}</strong>
              <p>{auth?.username || auth?.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={openEditor}
          >
            Edit profile
          </button>
          <button
            type="button"
            className="profile-dropdown-item danger"
            role="menuitem"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      )}

      {editing && (
        <div
          className="http-notify-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-title"
          onClick={() => !saving && setEditing(false)}
        >
          <form
            className="profile-dialog"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveProfile}
          >
            <div className="panel-head">
              <div>
                <h2 id="profile-edit-title">Edit profile</h2>
                <p className="panel-sub">Name, email, photo, and password</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Close
              </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="profile-photo-row">
              <Avatar
                auth={{ ...auth, avatar_url: form.avatar_url, name: form.name }}
                className="workspace-avatar profile-edit-avatar"
              />
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Change photo
                </button>
                {form.avatar_url ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, avatar_url: null }))
                    }
                  >
                    Remove
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickAvatar}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="profile-name">Display name</label>
                <input
                  id="profile-name"
                  className="input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="profile-email">Email / username</label>
                <input
                  id="profile-email"
                  className="input"
                  type="email"
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="profile-current">Current password</label>
                <input
                  id="profile-current"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={form.current_password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  placeholder="Only if changing password"
                />
              </div>
              <div className="field">
                <label htmlFor="profile-new">New password</label>
                <input
                  id="profile-new"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep"
                />
              </div>
            </div>

            <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
