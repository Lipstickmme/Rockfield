'use strict';

/**
 * Email alerts and the notification centre behind them.
 *
 * Every alert is written to the `alerts` collection first and only then
 * attempted over email, so the customer sees it in the app whether or not
 * Resend is configured, and an operator can see which ones failed to leave.
 *
 * Preference handling lives here too: a customer can silence most alerts, but
 * the ones marked `locked` in ALERT_TYPES - a password change, a rejected
 * transfer, an overdraft - go out regardless, which is what the regulation and
 * plain decency both want.
 */

const { db } = require('./db');
const ids = require('./ids');
const settings = require('./settings');
const contact = require('./contact');
const { ALERT_TYPES, BANK } = require('./constants');

const TYPES = new Map(ALERT_TYPES.map((t) => [t.id, t]));

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Money in cents to the string a customer recognises. */
function money(cents, currency = 'USD') {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/** Default preferences, overlaid with whatever the customer has chosen. */
function preferencesFor(user) {
  const stored = (user && user.alert_prefs) || {};
  const out = {};
  ALERT_TYPES.forEach((type) => {
    out[type.id] = type.locked ? true : stored[type.id] !== undefined ? Boolean(stored[type.id]) : type.default;
  });
  return out;
}

function wantsAlert(user, typeId) {
  const type = TYPES.get(typeId);
  if (type && type.locked) return true;
  return Boolean(preferencesFor(user)[typeId]);
}

/* -------------------------------------------------------------- the mail --- */

/**
 * The HTML part. Built as a table so it survives Outlook, and with an inline
 * palette because email clients strip stylesheets.
 */
function renderEmail({ heading, intro, rows = [], body = '', cta, footNote, bankName }) {
  const name = bankName || BANK.name;
  // Blank until an operator sets it at the console, in which case the whole
  // postal line comes out of the footer rather than leaving a dangling
  // separator before "Member FDIC".
  const postal = contact.addressLine();
  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse">
        ${rows.map((r) => `<tr>
          <td style="padding:9px 0;border-bottom:1px solid #e8e5df;color:#6c6760;font:13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${escapeHtml(r.label)}</td>
          <td style="padding:9px 0;border-bottom:1px solid #e8e5df;color:#191714;font:600 13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-align:right">${escapeHtml(r.value)}</td>
        </tr>`).join('')}
      </table>`
    : '';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f2ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e0d8;border-radius:14px;overflow:hidden">
        <tr><td style="background:#11213a;padding:20px 26px">
          <span style="color:#ffffff;font:700 17px/1.2 Georgia,'Times New Roman',serif;letter-spacing:.02em">${escapeHtml(name)}</span>
          <span style="display:block;color:#9fb2cc;font:500 11px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase">Member FDIC</span>
        </td></tr>
        <tr><td style="padding:26px">
          <h1 style="margin:0 0 10px;color:#11213a;font:600 21px/1.3 Georgia,'Times New Roman',serif">${escapeHtml(heading)}</h1>
          ${intro ? `<p style="margin:0 0 14px;color:#4a4640;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${escapeHtml(intro)}</p>` : ''}
          ${rowsHtml}
          ${body ? `<p style="margin:0 0 14px;color:#4a4640;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</p>` : ''}
          ${cta ? `<p style="margin:22px 0 0"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#11213a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font:600 14px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${escapeHtml(cta.label)}</a></p>` : ''}
          ${footNote ? `<p style="margin:22px 0 0;color:#847f76;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${escapeHtml(footNote)}</p>` : ''}
        </td></tr>
        <tr><td style="background:#faf8f4;border-top:1px solid #e8e5df;padding:18px 26px;color:#847f76;font:400 11px/1.7 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
          ${escapeHtml(name)} will never ask for your password, one-time code or full card number by email or phone.<br />
          If you did not expect this message, ${escapeHtml(contact.callFraud())} straight away.<br />
          ${postal ? `${escapeHtml(postal)} &middot; ` : ''}Member FDIC &middot; Equal Housing Lender
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** The text part: the same content, readable without HTML. */
function renderText({ heading, intro, rows = [], body = '', cta, footNote, bankName }) {
  const questions = contact.supportLine('Questions');
  const lines = [heading, ''];
  if (intro) lines.push(intro, '');
  rows.forEach((r) => lines.push(`${r.label}: ${r.value}`));
  if (rows.length) lines.push('');
  if (body) lines.push(body, '');
  if (cta) lines.push(`${cta.label}: ${cta.href}`, '');
  if (footNote) lines.push(footNote, '');
  lines.push(`${bankName || BANK.name} will never ask for your password or one-time code.`);
  // Left out entirely rather than printed as a label with nothing after it.
  if (questions) lines.push(questions);
  return lines.join('\n');
}

/* ---------------------------------------------------------------- send --- */

/**
 * Raise an alert with a customer.
 *
 * @param {object} user      the customer row
 * @param {string} typeId    one of ALERT_TYPES
 * @param {object} content   { heading, intro, rows, body, cta, footNote, subject, severity, meta }
 * @returns {Promise<object|null>} the stored alert, or null when suppressed
 */
async function notifyUser(user, typeId, content = {}) {
  if (!user || !user.id) return null;
  if (!content.force && !wantsAlert(user, typeId)) return null;

  const cfg = await settings.get();
  const bankName = cfg.bankName || BANK.name;
  const subject = content.subject || content.heading || 'Account notification';
  const payload = { ...content, bankName };

  const alert = {
    id: ids.uuid(),
    created_at: new Date().toISOString(),
    user_id: user.id,
    type: typeId,
    channel: 'email',
    subject,
    preview: content.intro || content.body || '',
    body_text: renderText(payload),
    body_html: renderEmail(payload),
    severity: content.severity || 'info',
    status: 'queued',
    sent_at: null,
    read_at: null,
    meta: content.meta || null,
  };
  await db.alerts.insert(alert);

  // Delivery is best effort. The record above is what the app shows either way.
  try {
    const notify = require('../utils/notify');
    const from = process.env.BANK_ALERT_FROM || process.env.FORM_FROM || `${bankName} <onboarding@resend.dev>`;
    const result = await notify.send({
      to: user.email,
      from,
      subject: `${subject}`,
      text: alert.body_text,
      html: alert.body_html,
    });
    const patch = result.ok
      ? { status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id || null }
      : { status: result.error === 'no_api_key' ? 'not_configured' : 'failed', error: result.error || null };
    await db.alerts.update(alert.id, patch);
    return { ...alert, ...patch };
  } catch (err) {
    await db.alerts.update(alert.id, { status: 'failed', error: err.message });
    return { ...alert, status: 'failed' };
  }
}

/** Send the same alert to a list of customers (admin broadcast). */
async function broadcast(users, typeId, content) {
  const out = [];
  for (const user of users) {
    out.push(await notifyUser(user, typeId, content));
  }
  return out.filter(Boolean);
}

/** Unread count for the bell in the header. */
async function unreadCount(userId) {
  const rows = await db.alerts.find({ user_id: userId, read_at: null });
  return rows.length;
}

module.exports = {
  notifyUser,
  broadcast,
  unreadCount,
  preferencesFor,
  wantsAlert,
  renderEmail,
  renderText,
  money,
  ALERT_TYPES,
};
