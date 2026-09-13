'use strict';

/**
 * Page shells for the bank, rendered at build time into static HTML.
 *
 * Three of them: the marketing pages anyone can see, the sign-in pages, and
 * the application shell behind them. They are built rather than assembled in
 * the browser so the first paint is the real page - a banking dashboard that
 * flashes an empty frame before the numbers arrive reads as broken.
 */

const { BANK, PRODUCTS } = require('../constants');
const logo = require('./logo');

const YEAR = new Date().getFullYear();

/**
 * Absolute URL for the link card. Scrapers do not resolve a relative path
 * against the page they fetched, so `/assets/...` shows up blank everywhere.
 * PUBLIC_BASE_URL is the domain when it is set; a Vercel deployment otherwise
 * knows its own hostname.
 */
function socialImage() {
  const base = process.env.PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://rockfieldbank.com');
  return `${base.replace(/\/+$/, '')}/assets/bank/og-image.png`;
}

/* ---------------------------------------------------------------- icons --- */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  accounts: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  transfer: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 11a3 3 0 1 0 0-6"/><path d="M18 20a6 6 0 0 0-2-4.5"/>',
  bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  deposit: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
  statement: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 13h5M10 17h5"/>',
  bell: '<path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 21h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  console: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  logout: '<path d="M10 5H5v14h5"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  building: '<path d="M4 21V5l8-2v18"/><path d="M12 9h8v12"/><path d="M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1"/>',
};

const icon = (name, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ----------------------------------------------------------------- head --- */

function head({ title, description, noindex = false, styles = [], bodyClass }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />${noindex ? '\n  <meta name="robots" content="noindex, nofollow" />' : ''}
  <meta name="theme-color" content="#11213a" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${BANK.name}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${socialImage()}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${socialImage()}" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/bank.css" />
  ${styles.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n  ')}
</head>
<body class="${bodyClass}">`;
}

const scripts = (list) =>
  `${list.map((src) => `  <script src="${src}" defer></script>`).join('\n')}\n</body>\n</html>`;

/* --------------------------------------------------------- app sidebar --- */

const NAV = [
  {
    group: 'Banking',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'home', key: 'dashboard' },
      { href: '/accounts', label: 'Accounts', icon: 'accounts', key: 'accounts' },
      { href: '/transactions', label: 'Transactions', icon: 'activity', key: 'transactions' },
      { href: '/statements', label: 'Statements', icon: 'statement', key: 'statements' },
    ],
  },
  {
    group: 'Move money',
    items: [
      { href: '/transfers', label: 'Transfers', icon: 'transfer', key: 'transfers' },
      { href: '/recipients', label: 'Recipients', icon: 'people', key: 'recipients' },
      { href: '/bills', label: 'Bill pay', icon: 'bill', key: 'bills' },
      { href: '/deposit', label: 'Deposit a check', icon: 'deposit', key: 'deposit' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/cards', label: 'Cards', icon: 'card', key: 'cards' },
      { href: '/alerts', label: 'Alerts', icon: 'bell', key: 'alerts', pip: 'alerts' },
      { href: '/messages', label: 'Messages', icon: 'mail', key: 'messages', pip: 'messages' },
      { href: '/security', label: 'Security', icon: 'shield', key: 'security' },
      { href: '/profile', label: 'Profile', icon: 'user', key: 'profile' },
    ],
  },
];

function sidebar(active) {
  const groups = NAV.map((group) => `
        <div class="rf-nav-group">
          <h6>${group.group}</h6>
          ${group.items.map((item) => `<a href="${item.href}"${item.key === active ? ' class="is-active"' : ''}>${icon(item.icon)}<span>${item.label}</span>${item.pip ? `<em class="rf-pip rf-hide" data-pip="${item.pip}"></em>` : ''}</a>`).join('\n          ')}
        </div>`).join('');

  return `
    <aside class="rf-side" id="rf-side">
      <div class="rf-side-brand">
        <span class="rf-mark">${logo.emblem({ height: 26, weight: 8 })}</span>
        <span>
          <strong>${BANK.shortName}</strong>
          <small>Online banking</small>
        </span>
      </div>
      <nav class="rf-nav">${groups}
        <div class="rf-nav-group rf-hide" data-admin-only>
          <h6>Staff</h6>
          <a href="/console">${icon('console')}<span>Admin console</span></a>
        </div>
      </nav>
      <div class="rf-side-foot">
        <div class="rf-side-user">
          <span class="rf-avatar" data-user-avatar>RF</span>
          <span>
            <strong data-user-name>&nbsp;</strong>
            <span data-user-number>&nbsp;</span>
          </span>
        </div>
        <button class="rf-btn ghost sm block" data-signout>${icon('logout', 15)} Sign out</button>
      </div>
    </aside>`;
}

/**
 * The application shell: sidebar, sticky header, content.
 * `actions` is raw HTML for the right-hand side of the header.
 */
function appPage({ title, description, heading, sub, active, content, extraScripts = [], actions = '', wide = false }) {
  return [
    head({ title, description, noindex: true, bodyClass: 'rf-app' }),
    `  <div class="rf-shell">`,
    sidebar(active),
    `    <div class="rf-main">
      <header class="rf-top">
        <button class="rf-burger" id="rf-burger" aria-label="Open menu"><span></span></button>
        <div>
          <h1>${heading}</h1>
          ${sub ? `<p class="rf-top-sub">${sub}</p>` : ''}
        </div>
        <div class="rf-top-actions">
          ${actions}
          <a class="rf-icon-btn" href="/alerts" aria-label="Alerts">${icon('bell')}<em class="rf-pip rf-hide" data-pip="alerts"></em></a>
          <a class="rf-icon-btn" href="/profile" aria-label="Profile"><span class="rf-avatar sm" data-user-avatar>RF</span></a>
        </div>
      </header>
      <main class="rf-content${wide ? '' : ''}" id="rf-content">
        <div class="rf-notice rf-hide" data-announcement></div>
${content}
      </main>
    </div>
  </div>
  <div class="rf-toasts" id="rf-toasts"></div>`,
    scripts(['/js/bank/core.js', ...extraScripts]),
  ].join('\n');
}

/** The sign-in shell: a panel on the right, the bank's case on the left. */
function authPage({ title, description, content, extraScripts = [] }) {
  return [
    head({ title, description, noindex: true, bodyClass: 'rf-auth' }),
    `  <div class="rf-auth-wrap">
    <section class="rf-auth-aside">
      <a class="brandline" href="/" style="text-decoration:none;color:inherit">
        <span class="rf-mark">${logo.emblem({ height: 26, weight: 8 })}</span>
        <strong>${BANK.name}</strong>
      </a>
      <h2>Your money, held the way a bank should hold it.</h2>
      <p>${BANK.tagline} Deposits insured by the FDIC to the maximum permitted by law, and a real person on the phone when you need one.</p>
      <ul class="rf-auth-points">
        <li>${icon('check', 17)}<span>Two-step verification on every sign-in and every payment</span></li>
        <li>${icon('check', 17)}<span>Instant alerts the moment money moves</span></li>
        <li>${icon('check', 17)}<span>Zero liability on unauthorised card transactions</span></li>
        <li>${icon('check', 17)}<span>FDIC Certificate ${BANK.fdicCert} &middot; NMLS ${BANK.nmls}</span></li>
      </ul>
      <div class="rf-auth-foot">
        ${BANK.name} will never call, text or email to ask for your password or a one-time code.<br />
        Report anything suspicious on <span data-site="fraudPhone">our fraud line</span>.<br />
        &copy; ${YEAR} ${BANK.legalName}. Member FDIC. Equal Housing Lender.
      </div>
    </section>
    <section class="rf-auth-panel">
${content}
    </section>
  </div>
  <div class="rf-toasts" id="rf-toasts"></div>`,
    scripts(['/js/bank/core.js', ...extraScripts]),
  ].join('\n');
}

/* -------------------------------------------------------- marketing bits --- */

function marketingNav(active = '') {
  const link = (href, label, key) =>
    `<a href="${href}"${key === active ? ' style="background:var(--rf-surface-3)"' : ''}>${label}</a>`;
  return `
  <header class="rf-marketing-nav">
    <div class="wrap inner">
      <a class="brandline" href="/" aria-label="${BANK.name} home">
        <span class="rf-mark on-paper">${logo.emblem({ height: 34, weight: 7 })}</span>
        <span>
          <strong>${BANK.shortName}<span class="rf-full-name"> ${BANK.name.replace(`${BANK.shortName} `, '')}</span></strong>
          <small>Member FDIC</small>
        </span>
      </a>
      <nav>
        ${link('/personal', 'Personal', 'personal')}
        ${link('/business', 'Business', 'business')}
        ${link('/rates', 'Rates &amp; fees', 'rates')}
        ${link('/security-center', 'Security', 'security-center')}
        ${link('/support', 'Support', 'support')}
      </nav>
      <span class="spacer"></span>
      <div class="actions">
        <a class="rf-btn ghost sm" href="/open-account">Open an account</a>
        <a class="rf-btn sm" href="/signin">Sign in</a>
      </div>
    </div>
  </header>`;
}

function marketingFooter() {
  return `
  <footer class="rf-footer">
    <div class="wrap">
      <div class="cols">
        <div>
          <div class="brandline" style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
            <span class="rf-mark">${logo.emblem({ height: 26, weight: 8 })}</span>
            <strong style="color:#fff;font-family:var(--rf-display);font-size:16px">${BANK.name}</strong>
          </div>
          <p style="margin:0 0 12px;max-width:34ch">${BANK.tagline} Personal and business banking since ${BANK.established}.</p>
          <p style="margin:0;font-size:12.5px" data-site-row="address" hidden><span data-site="address"></span></p>
        </div>
        <div>
          <h5>Bank</h5>
          <a href="/personal">Personal banking</a>
          <a href="/business">Business banking</a>
          <a href="/rates">Rates and fees</a>
          <a href="/open-account">Open an account</a>
        </div>
        <div>
          <h5>Support</h5>
          <a href="/support">Help centre</a>
          <a href="/security-center">Security centre</a>
          <a href="#" data-site-row="phone" data-site="phone" hidden></a>
          <a href="mailto:${BANK.email}">${BANK.email}</a>
        </div>
        <div>
          <h5>Legal</h5>
          <a href="/legal#privacy">Privacy notice</a>
          <a href="/legal#terms">Online banking agreement</a>
          <a href="/legal#disclosures">Truth in Savings</a>
          <a href="/legal#accessibility">Accessibility</a>
        </div>
      </div>
      <div class="legal">
        <strong>${BANK.legalName}</strong> &middot; Member FDIC &middot; Equal Housing Lender &middot; FDIC Certificate ${BANK.fdicCert} &middot; NMLS ID ${BANK.nmls}<br />
        Deposits are insured by the Federal Deposit Insurance Corporation up to $250,000 per depositor, per insured bank, for each account ownership category.
        Annual Percentage Yields shown are accurate as of ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} and may change after account opening. Fees may reduce earnings.
        Credit products are subject to credit approval.<br />
        This is a demonstration application. ${BANK.name} is a fictional institution: the routing number, account numbers and card numbers used here are synthetic and address no real financial institution.<br />
        &copy; ${YEAR} ${BANK.legalName}. All rights reserved.
      </div>
    </div>
  </footer>`;
}

/**
 * A public page: nav, content, footer, and the live chat widget the site
 * inherited from the template, which reaches the same client services desk.
 *
 * /js/main.js comes with every one of them because it is what submits the
 * contact form and what keeps the address and phone number on the page in step
 * with whatever the desk has set under Settings.
 */
function marketingPage({ title, description, active, content, extraScripts = [], bodyClass = 'rf-site' }) {
  const { chatWidget } = require('../../site/layout');
  return [
    head({ title, description, bodyClass }),
    marketingNav(active),
    content,
    marketingFooter(),
    chatWidget(),
    `  <div class="rf-toasts" id="rf-toasts"></div>`,
    scripts(['/js/main.js', '/js/supabase-lite.js', '/js/chat.js', ...extraScripts]),
  ].join('\n');
}

/* ----------------------------------------------------------- small parts --- */

/** A product card, shared by the home page and the product pages. */
function productCard(product) {
  const headline = product.apy != null && product.apy > 0
    ? `<div class="rf-rate rate">${product.apy.toFixed(2)}%<small> APY</small></div>`
    : product.apr
      ? `<div class="rf-rate rate">${product.apr.toFixed(2)}%<small> APR var.</small></div>`
      : '<div class="rf-rate rate">$0<small> monthly fee</small></div>';
  return `
      <article class="rf-product">
        ${headline}
        <h3>${product.name}</h3>
        <p>${product.blurb}</p>
        <ul>
          ${product.features.map((f) => `<li>${icon('check', 15)}<span>${f}</span></li>`).join('\n          ')}
        </ul>
        <a class="rf-btn ghost" href="/open-account?product=${product.id}">Open ${product.name} <span aria-hidden="true">&rsaquo;</span></a>
      </article>`;
}

const productGrid = (ids) =>
  `<div class="rf-grid cols-3">${(ids ? PRODUCTS.filter((p) => ids.includes(p.id)) : PRODUCTS).map(productCard).join('')}</div>`;

module.exports = { head, scripts, appPage, authPage, marketingPage, marketingNav, marketingFooter, sidebar, icon, productCard, productGrid, NAV, BANK };
