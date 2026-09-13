'use strict';

/**
 * Runtime settings: the defaults in constants.js, with whatever the admin
 * console has overridden layered on top.
 *
 * Read through get() everywhere so an operator changing a limit or a fee does
 * not need a deploy. Cached briefly because the dashboard asks on nearly every
 * request and the answer changes a few times a year.
 */

const { db } = require('./db');
const { DEFAULT_SETTINGS } = require('./constants');

const ROW_ID = 'global';
const TTL_MS = 5000;

let cached = null;
let cachedAt = 0;

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object') {
      out[key] = deepMerge(base[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

async function get() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  let stored = null;
  try {
    stored = await db.settings.findById(ROW_ID);
  } catch (err) {
    console.warn('[rockfield] settings read failed, using defaults:', err.message);
  }
  cached = deepMerge(DEFAULT_SETTINGS, stored ? stored.values : null);
  cachedAt = Date.now();
  return cached;
}

async function save(patch) {
  const current = await get();
  const values = deepMerge(current, patch);
  const existing = await db.settings.findById(ROW_ID);
  if (existing) {
    await db.settings.update(ROW_ID, { values, updated_at: new Date().toISOString() });
  } else {
    await db.settings.insert({ id: ROW_ID, values, updated_at: new Date().toISOString() });
  }
  cached = values;
  cachedAt = Date.now();
  return values;
}

function invalidate() {
  cached = null;
  cachedAt = 0;
}

module.exports = { get, save, invalidate, deepMerge };
