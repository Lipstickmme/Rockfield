'use strict';

/**
 * The shared front end for Rockfield online banking.
 *
 * Everything here is plain browser JavaScript: one global, no build step, no
 * framework. It gives the page scripts an API client that carries the CSRF
 * token, money and date formatting that matches the server's, a session
 * bootstrap that decides whether this page may be shown at all, and the small
 * furniture - toasts, modals, the sidebar - that every screen uses.
 */

(function () {
  const API = '/api/bank';

  /* ------------------------------------------------------------ helpers -- */

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const money = (cents, currency) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(Number(cents || 0) / 100);

  /** Signed, for a transaction row: credits carry a plus, debits a minus. */
  const signedMoney = (cents, direction) =>
    `${direction === 'credit' ? '+' : '−'}${money(Math.abs(Number(cents || 0)))}`;

  const date = (iso, opts) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const datetime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  /** "3 minutes ago", down to the day; anything older gets a date. */
  const ago = (iso) => {
    if (!iso) return '';
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;
    return date(iso);
  };

  const cookie = (name) => {
    const match = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
  };

  const qs = (selector, root) => (root || document).querySelector(selector);
  const qsa = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  /** Read a form into a plain object, skipping empty strings. */
  function formData(form, { keepEmpty = false } = {}) {
    const out = {};
    Array.from(form.elements).forEach((el) => {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') { out[el.name] = el.checked; return; }
      if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; return; }
      const value = typeof el.value === 'string' ? el.value.trim() : el.value;
      if (value === '' && !keepEmpty) return;
      out[el.name] = value;
    });
    return out;
  }

  /* ---------------------------------------------------------------- api -- */

  class ApiError extends Error {
    constructor(message, status, code, body) {
      super(message);
      this.status = status;
      this.code = code;
      this.body = body;
    }
  }

  async function request(method, path, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const csrf = cookie('rf_csrf');
    if (csrf && method !== 'GET') headers['X-Rockfield-CSRF'] = csrf;

    // Paths are relative to the banking API unless they already name a full
    // one: '/transfers' is ours, '/api/bank/documents/x/file' is already whole.
    const url = /^(https?:)?\/\//.test(path) || path.startsWith('/api/')
      ? path
      : `${API}${path.startsWith('/') ? '' : '/'}${path}`;

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new ApiError('We could not reach the bank. Check your connection and try again.', 0, 'offline');
    }

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) { data = null; }

    if (!res.ok) {
      // A session that has gone takes the customer back to the front door
      // rather than leaving a screen full of failed panels.
      if (res.status === 401 && !/\/auth\/(login|verify|resend)/.test(path)) {
        if (document.body.classList.contains('rf-app')) {
          const next = encodeURIComponent(location.pathname + location.search);
          location.replace(`/signin?next=${next}&reason=expired`);
          return new Promise(() => {});
        }
      }
      if (res.status === 428 && document.body.classList.contains('rf-app')) {
        location.replace('/change-password');
        return new Promise(() => {});
      }
      throw new ApiError((data && data.message) || `Something went wrong (${res.status}).`, res.status, data && data.error, data);
    }
    return data;
  }

  const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body === undefined ? {} : body),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
  };

  /* ------------------------------------------------------------- toasts -- */

  function toast(message, kind = '', title = '') {
    const host = qs('#rf-toasts') || (() => {
      const el = document.createElement('div');
      el.className = 'rf-toasts';
      el.id = 'rf-toasts';
      document.body.appendChild(el);
      return el;
    })();
    const node = document.createElement('div');
    node.className = `rf-toast ${kind}`;
    node.innerHTML = `<div>${title ? `<strong>${esc(title)}</strong>` : ''}<span>${esc(message)}</span></div>`;
    host.appendChild(node);
    setTimeout(() => {
      node.style.transition = 'opacity .25s ease, transform .25s ease';
      node.style.opacity = '0';
      node.style.transform = 'translateY(8px)';
      setTimeout(() => node.remove(), 260);
    }, kind === 'bad' ? 7000 : 4200);
    return node;
  }

  /* -------------------------------------------------------------- forms -- */

  /** Show an error inside a form's notice strip, or as a toast if it has none. */
  function showError(form, message) {
    const box = form && qs('[data-form-error]', form);
    if (!box) { toast(message, 'bad'); return; }
    box.textContent = message;
    box.classList.remove('rf-hide');
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function clearError(form) {
    const box = form && qs('[data-form-error]', form);
    if (box) { box.textContent = ''; box.classList.add('rf-hide'); }
  }

  /**
   * Wire a form to an async handler: disables the button while it runs, shows
   * whatever it throws in the form's error strip, and never double-submits.
   */
  function onSubmit(form, handler) {
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = qs('[data-submit]', form) || qs('button[type="submit"]', form);
      if (button && button.classList.contains('is-busy')) return;
      clearError(form);
      const label = button ? button.innerHTML : '';
      if (button) { button.classList.add('is-busy'); button.innerHTML = 'Working&hellip;'; }
      try {
        await handler(formData(form), form);
      } catch (err) {
        showError(form, err.message || 'Something went wrong.');
      } finally {
        if (button) { button.classList.remove('is-busy'); button.innerHTML = label; }
      }
    });
  }

  /* ------------------------------------------------------------- modals -- */

  const modal = {
    open(el) { if (el) el.classList.remove('rf-hide'); document.body.style.overflow = 'hidden'; },
    close(el) { if (el) el.classList.add('rf-hide'); document.body.style.overflow = ''; },
    wire(el) {
      if (!el) return;
      qsa('[data-close-modal]', el).forEach((btn) => btn.addEventListener('click', () => modal.close(el)));
      el.addEventListener('click', (event) => { if (event.target === el) modal.close(el); });
    },
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    qsa('.rf-modal-backdrop:not(.rf-hide)').forEach((el) => modal.close(el));
  });

  /* -------------------------------------------------------------- files -- */

  /**
   * Read a file as a data URL, shrinking photographs on the way.
   *
   * A phone camera produces four megabytes of JPEG for a check that is legible
   * at 1600px wide, and the request ceiling is eight. Resizing here also means
   * the customer is not made to wait on their own upload.
   */
  function readFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Choose a file first.'));
      if (file.size > 12 * 1024 * 1024) return reject(new Error('That file is larger than 12MB.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('That file could not be read.'));
      reader.onload = () => {
        const dataUrl = String(reader.result);
        if (!/^data:image\//.test(dataUrl) || /^data:image\/(svg|gif)/.test(dataUrl)) return resolve(dataUrl);
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          if (scale >= 1 && dataUrl.length < 1.5e6) return resolve(dataUrl);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------- charts -- */

  /** A donut, as inline SVG. Data is [{ label, amount, color }]. */
  function donut(data, { size = 138, thickness = 20 } = {}) {
    const total = data.reduce((sum, d) => sum + d.amount, 0) || 1;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const rings = data.map((d) => {
      const length = (d.amount / total) * circumference;
      const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${d.color}" stroke-width="${thickness}"
        stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})" />`;
      offset += length;
      return seg;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Spending by category">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--rf-surface-3)" stroke-width="${thickness}" />
      ${rings}
    </svg>`;
  }

  const CHART_COLORS = ['#1b3457', '#b08341', '#1b7a53', '#a3352b', '#4a6fa5', '#8a6a1f', '#2f8f8f', '#6b4c9a', '#9aa1ab'];

  /* ------------------------------------------------------------ session -- */

  const state = { session: null, user: null };

  function paintUser(session) {
    const user = session.user || {};
    qsa('[data-user-name]').forEach((el) => { el.textContent = user.preferredName || user.fullName || user.email || ''; });
    qsa('[data-user-number]').forEach((el) => { el.textContent = user.customerNumber || ''; });
    qsa('[data-user-avatar]').forEach((el) => {
      if (user.photoUrl) el.innerHTML = `<img src="${esc(user.photoUrl)}" alt="" />`;
      else el.textContent = user.initials || 'RF';
    });
    qsa('[data-admin-only]').forEach((el) => el.classList.toggle('rf-hide', user.role !== 'admin'));

    const pips = { alerts: session.unreadAlerts, messages: session.unreadMessages };
    Object.entries(pips).forEach(([key, count]) => {
      qsa(`[data-pip="${key}"]`).forEach((el) => {
        el.textContent = count > 99 ? '99+' : String(count || '');
        el.classList.toggle('rf-hide', !count);
      });
    });

    const banner = qs('[data-announcement]');
    if (banner && session.announcement) {
      banner.textContent = session.announcement;
      banner.className = `rf-notice ${session.announcementLevel === 'info' ? '' : session.announcementLevel || ''}`;
      banner.classList.remove('rf-hide');
    }
  }

  /**
   * Fill in the bank's contact details, wherever the page asks for them.
   *
   * The telephone numbers and the postal address are set by an operator at the
   * console, not built into the page, so the markup ships with a standing
   * phrase ("us", "our fraud line") or a hidden row and this replaces it once
   * /config answers. Skipped entirely on a page that asks for none of them.
   */
  async function hydrateContact() {
    const fields = qsa('[data-site]');
    const rows = qsa('[data-site-row]');
    if (!fields.length && !rows.length) return;
    let bank;
    try {
      bank = (await api.get('/config')).bank || {};
    } catch (err) {
      return; // The standing phrases are correct on their own.
    }
    fields.forEach((el) => {
      const value = bank[el.getAttribute('data-site')];
      if (!value) return;
      el.textContent = value;
      if (el.tagName === 'A') el.href = `tel:${String(value).replace(/[^+\d]/g, '')}`;
    });
    rows.forEach((row) => { row.hidden = !bank[row.getAttribute('data-site-row')]; });
  }

  async function bootstrap() {
    const isApp = document.body.classList.contains('rf-app');
    let session = null;
    try {
      session = await api.get('/auth/session');
    } catch (err) {
      session = { authenticated: false };
    }
    state.session = session;
    state.user = session.user || null;

    if (isApp) {
      if (!session.authenticated) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace(`/signin?next=${next}`);
        return new Promise(() => {});
      }
      if (session.mustChangePassword && !location.pathname.startsWith('/change-password')) {
        location.replace('/change-password');
        return new Promise(() => {});
      }
      // The console is staff only. The API refuses either way; this is so a
      // customer who follows a link sees the dashboard rather than a wall of
      // 403s.
      if (location.pathname.startsWith('/console') && session.user.role !== 'admin') {
        location.replace('/dashboard');
        return new Promise(() => {});
      }
      paintUser(session);
    }
    // Not awaited: nothing on the page is blocked on a telephone number, and a
    // slow /config should not hold up the dashboard behind it.
    hydrateContact();
    return session;
  }

  /* ---------------------------------------------------------- furniture -- */

  function wireShell() {
    const side = qs('#rf-side');
    const burger = qs('#rf-burger');
    if (burger && side) {
      burger.addEventListener('click', () => {
        side.classList.toggle('is-open');
        if (side.classList.contains('is-open')) {
          const scrim = document.createElement('div');
          scrim.className = 'rf-scrim';
          scrim.addEventListener('click', () => { side.classList.remove('is-open'); scrim.remove(); });
          document.body.appendChild(scrim);
        } else {
          const scrim = qs('.rf-scrim');
          if (scrim) scrim.remove();
        }
      });
    }

    qsa('[data-signout]').forEach((btn) => btn.addEventListener('click', async () => {
      try { await api.post('/auth/logout'); } catch (err) { /* leaving anyway */ }
      location.href = '/signin?reason=signed-out';
    }));

    // Mark the current page in the sidebar even when a page was reached by a
    // route that is not its own href.
    qsa('.rf-nav a').forEach((link) => {
      if (link.getAttribute('href') === location.pathname) link.classList.add('is-active');
    });
  }

  /* ---------------------------------------------------------- lifecycle -- */

  const readyQueue = [];
  let booted = null;

  /** Run a page script once the session is known and the shell is wired. */
  function ready(fn) {
    readyQueue.push(fn);
    if (booted) booted.then((session) => fn(session));
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireShell();
    booted = bootstrap().then((session) => {
      readyQueue.splice(0).forEach((fn) => {
        try {
          fn(session);
        } catch (err) {
          console.error('[rockfield] page script failed', err);
          toast('Something on this page did not load. Refresh to try again.', 'bad');
        }
      });
      return session;
    });
  });

  /* ------------------------------------------------------------- export -- */

  window.RF = {
    API,
    api,
    ApiError,
    esc,
    money,
    signedMoney,
    date,
    datetime,
    ago,
    cookie,
    qs,
    qsa,
    formData,
    onSubmit,
    showError,
    clearError,
    toast,
    modal,
    readFile,
    donut,
    CHART_COLORS,
    ready,
    state,
    paintUser,
    /** Status text -> badge class, shared by every table that shows one. */
    badge(status, label) {
      const cls = String(status || '').toLowerCase().replace(/[^a-z_]/g, '');
      return `<span class="rf-badge ${cls}">${esc(label || String(status || '').replace(/_/g, ' '))}</span>`;
    },
    /** Copy text and say so. */
    async copy(text, what = 'Copied') {
      try {
        await navigator.clipboard.writeText(text);
        toast(`${what} to the clipboard.`, 'ok');
      } catch (err) {
        toast('Your browser would not let us copy that.', 'bad');
      }
    },
  };
}());
