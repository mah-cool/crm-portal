/* Shared front-end auth helper used by login.html, dashboard.html, and index.html. */
window.Auth = (function () {
  'use strict';

  async function me() {
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await r.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  async function logout() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); }
    finally { window.location.href = 'index.html'; }
  }

  // Posts credentials, shows a note, redirects on success.
  async function submit(url, payload, noteEl, redirectTo) {
    if (noteEl) { noteEl.textContent = 'Please wait…'; noteEl.className = 'form-note'; }
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (noteEl) { noteEl.textContent = data.error || 'Something went wrong.'; noteEl.className = 'form-note err'; }
        return;
      }
      window.location.href = redirectTo || 'app.html';
    } catch {
      if (noteEl) { noteEl.textContent = 'Network error. Please try again.'; noteEl.className = 'form-note err'; }
    }
  }

  // Generic authenticated JSON fetch for the app. Throws on error with .message.
  async function api(path, opts) {
    opts = opts || {};
    const r = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (r.status === 401) { window.location.href = 'login.html'; throw new Error('Not authenticated'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('Request failed (' + r.status + ')'));
    return data;
  }

  // Swaps the "Login" nav CTA for a greeting + log out when signed in.
  async function decorateNav() {
    const slot = document.querySelector('[data-auth-slot]');
    if (!slot) return;
    const user = await me();
    if (user) {
      slot.innerHTML =
        '<span class="nav-account"><a class="hi" href="app.html">Hi, ' +
        escapeHtml(user.name.split(' ')[0]) +
        '</a> <a href="#" data-logout>Log out</a></span>';
      const lo = slot.querySelector('[data-logout]');
      if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); logout(); });
    } else {
      slot.innerHTML = '<a href="login.html" class="nav-cta">Login</a>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { me, logout, submit, api, decorateNav, escapeHtml };
})();
