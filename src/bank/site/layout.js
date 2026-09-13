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

/*
 * The icon set.
 *
 * Drawn to sit with the logo and the serif rather than against them: flat-cut
 * ends and mitred corners instead of rounded ones, symmetrical about their own
 * axis, and built out of the same vocabulary the mark uses - a pediment, a
 * stylobate, a ruled line. The effect wanted is engraved, like the artwork on
 * a share certificate, not the rounded geometric set that ships with every
 * dashboard.
 *
 * All on a 24 x 24 grid, and all stroked - none of them are filled, so one
 * definition serves a navy sidebar and a white page.
 */
const ICONS = {
  // A portico on four columns. The dashboard of a bank should look like one.
  home: '<path d="M2.8 9.6 12 4l9.2 5.6"/><path d="M5.2 9.6v8.2M9.7 9.6v8.2M14.3 9.6v8.2M18.8 9.6v8.2"/><path d="M3.6 17.8h16.8"/><path d="M2.4 20.4h19.2"/>',
  // A bound ledger, seen from the spine side.
  accounts: '<path d="M4.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v12.5H7a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M4.5 17A2.5 2.5 0 0 1 7 14.5h13"/><path d="M8.5 8.5h7"/>',
  // A ruled line with the figures moving across it.
  activity: '<path d="M2.5 20.5h19"/><path d="M3.5 14.5 8 10l3.5 3.5L16.5 7l4 4"/>',
  transfer: '<path d="M3.5 9h14"/><path d="M13.8 5.2 17.6 9l-3.8 3.8"/><path d="M20.5 15h-14"/><path d="M10.2 11.2 6.4 15l3.8 3.8"/>',
  people: '<circle cx="9" cy="7.6" r="3.3"/><path d="M3.2 19.8a5.8 5.8 0 0 1 11.6 0"/><path d="M16.2 5.1a3.3 3.3 0 0 1 0 6.2"/><path d="M17 14a5.8 5.8 0 0 1 3.8 5.5"/>',
  // A bill with a torn foot.
  bill: '<path d="M6 3h12v18l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  deposit: '<path d="M12 3.5V14"/><path d="M7.6 9.6 12 14l4.4-4.4"/><path d="M3.5 16.8v3.7h17v-3.7"/>',
  card: '<path d="M2.5 5h19v14h-19z"/><path d="M2.5 9.6h19"/><path d="M5.6 12.6h4.2v3.2H5.6z"/>',
  statement: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 11.5h6M9 15h6M9 18.5h3.5"/>',
  bell: '<path d="M4.9 18.4c1.6-1.6 2.3-3.2 2.3-5.6v-1.9a4.8 4.8 0 0 1 9.6 0v1.9c0 2.4.7 4 2.3 5.6z"/><path d="M9.8 21.2h4.4"/><path d="M12 4.2V2.6"/>',
  mail: '<path d="M2.5 5h19v14h-19z"/><path d="m2.5 5.9 9.5 6.6 9.5-6.6"/>',
  // A heraldic shield: straight shoulders, a point at the foot.
  shield: '<path d="M12 2.8 4.7 5.5v6.1c0 4.4 2.9 7.7 7.3 9.6 4.4-1.9 7.3-5.2 7.3-9.6V5.5z"/>',
  user: '<circle cx="12" cy="7.8" r="3.6"/><path d="M4.8 20.6a7.2 7.2 0 0 1 14.4 0"/>',
  console: '<path d="M2.5 4h19v16h-19z"/><path d="M2.5 8.6h19M9 8.6V20"/>',
  logout: '<path d="M10.5 4.5H5v15h5.5"/><path d="m15.4 8 4 4-4 4"/><path d="M19.4 12H9.6"/>',
  check: '<path d="m4.6 12.2 4.8 4.8L19.4 6.8"/>',
  // A padlock with a keyhole, which is the part that says "locked".
  lock: '<path d="M4 10h16v11H4z"/><path d="M7.8 10V7.2a4.2 4.2 0 0 1 8.4 0V10"/><circle cx="12" cy="14.6" r="1.4"/><path d="M12 16v2.4"/>',
  // Hands, and the four quarter marks of a dial.
  clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 6.6V12l3.9 2.3"/><path d="M12 3.2v1.5M20.8 12h-1.5M12 20.8v-1.5M3.2 12h1.5"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m15.7 15.7 5 5"/>',
  chart: '<path d="M2.5 20.5h19"/><path d="M5.8 20.5V12M10.5 20.5V5.6M15.2 20.5v-6M19.9 20.5V9.2"/>',
  plus: '<path d="M12 4.6v14.8M4.6 12h14.8"/>',
  building: '<path d="M3.4 20.5V6.2L12 3.5v17"/><path d="M12 9.6h8.6v10.9"/><path d="M2 20.5h20"/><path d="M6.6 8.8v1.7M6.6 13.1v1.7M6.6 17.4v1.7M15.8 13.1v1.7M15.8 17.4v1.7"/>',
};

/**
 * One icon, inline.
 *
 * Butt caps and mitred joins are the whole difference between this set and a
 * rounded one: a flat-cut end and a sharp corner read as engraved, which is
 * what sits with the serif.
 */
const icon = (name, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="6" aria-hidden="true">${ICONS[name] || ''}</svg>`;

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
  <link rel="stylesheet" href="/css/fonts.css" />
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
        <img class="rf-mark" src="/assets/bank/logomark-light.png" alt="" width="53" height="28" />
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
      <a class="brandline" href="/" aria-label="${BANK.name} home">
        <img class="rf-lockup" src="/assets/bank/logo-light.png" alt="${BANK.name}" width="240" height="143" />
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
        <img class="rf-mark on-paper" src="/assets/bank/logomark-dark.png" alt="" width="87" height="46" />
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
          <img class="rf-lockup" src="/assets/bank/logo-light.png" alt="${BANK.name}" width="190" height="113" style="margin-bottom:16px" />
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
