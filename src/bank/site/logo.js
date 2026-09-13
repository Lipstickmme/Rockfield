'use strict';

/**
 * The Rockfield mark, in one place.
 *
 * A boulder with a banking hall in front of it, drawn as open line work so it
 * carries at any size and in either colour. Everything is stroked with
 * `currentColor` and nothing is filled, which is what lets the same geometry
 * sit on a navy sidebar and on a white page without a second copy of the file.
 *
 * Consumed three ways:
 *   - inline in the page shells (src/bank/site/layout.js), so it inherits the
 *     surrounding colour and costs no extra request;
 *   - written out as standalone SVGs by scripts/build-brand.js, for the staff
 *     desk, for anyone who needs a file, and as the source for the favicons;
 *   - rasterised by that same script into the favicons and the link card.
 *
 * The shapes are deliberately laid out so none of them overlap: the boulder's
 * right face stops where the hall's plinth begins. Occlusion would need an
 * opaque fill, and an opaque fill would need to know the background colour.
 */

/** The drawing sits in a 240 x 150 box. Everything below is in those units. */
const VIEWBOX = { width: 240, height: 150 };

/**
 * The line work, as an array of SVG elements.
 *
 * Split into `heavy` (the silhouette) and `fine` (fractures, columns, the
 * oculus) so the two can take different stroke weights: at favicon sizes the
 * fine work is dropped entirely, because a 1px line at 32 x 32 is a smudge.
 */
const HEAVY = [
  // The ground the whole mark stands on.
  '<path d="M14 141 H226" />',

  // The boulder: up the left face, across the crown, down the right face,
  // ending on the plinth's top edge so it reads as standing behind the hall.
  '<path d="M27 141 L38 96 L55 62 L76 36 L98 31 L114 47 L126 70 L134 96 L139 118 L142 124" />',

  // The hall: pediment, entablature, stylobate, and the plinth that flares
  // out to meet the ground.
  '<path d="M126 79 L168 49 L210 79" />',
  '<path d="M126 79 H210 V88 H126 Z" />',
  '<path d="M124 116 H212 V124 H124 Z" />',
  '<path d="M120 124 H216 L226 141 H110 Z" />',
];

const FINE = [
  // Two fractures across the boulder's face.
  '<path d="M79 39 L64 71 L75 100 L62 124" />',
  '<path d="M101 61 L89 86 L99 110" />',

  // The oculus in the pediment.
  '<circle cx="168" cy="70" r="4" />',

  // Six columns.
  '<path d="M137 88 V116" />',
  '<path d="M148 88 V116" />',
  '<path d="M159 88 V116" />',
  '<path d="M170 88 V116" />',
  '<path d="M181 88 V116" />',
  '<path d="M192 88 V116" />',
];

/**
 * The mark as an inline <svg>.
 *
 * @param {object} [opts]
 * @param {number} [opts.height]   rendered height in px; width follows the ratio
 * @param {number} [opts.weight]   stroke width for the silhouette, in view units
 * @param {boolean} [opts.detail]  false drops the fine line work, for small sizes
 * @param {string} [opts.className]
 * @param {string} [opts.title]    an accessible name; omit for decorative use
 */
function emblem({ height = 28, weight = 7, detail = true, className = '', title = '' } = {}) {
  const width = Math.round((height * VIEWBOX.width) / VIEWBOX.height);
  const columns = detail ? FINE.join('\n      ') : '';
  return `<svg viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${width}" height="${height}"${className ? ` class="${className}"` : ''} fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>
      <g stroke-width="${weight}">
      ${HEAVY.join('\n      ')}
      </g>${detail ? `
      <g stroke-width="${Math.max(3.5, weight * 0.62)}">
      ${columns}
      </g>` : ''}
    </svg>`;
}

/**
 * The full lockup: the mark, then ROCKFIELD over BANK.
 *
 * Horizontal by default because a nav bar is short. The stacked arrangement of
 * the original artwork is what `wordmark(...)` writes to file for print and for
 * the link card, where there is room for it.
 */
function lockup({ height = 30, subtitle = 'BANK', className = '' } = {}) {
  return `<span class="rf-logo ${className}">
      ${emblem({ height, weight: 7, detail: true })}
      <span class="rf-logo-type">
        <strong>ROCKFIELD</strong>
        <em>${subtitle}</em>
      </span>
    </span>`;
}

/**
 * The mark reduced to two filled silhouettes, for small sizes.
 *
 * Open line work needs about 3px of stroke to survive, which a 16 x 16 icon
 * does not have: at that size the outlines merge into a grey smear and the
 * interior detail becomes noise. Filled shapes keep a readable edge all the
 * way down, so the favicon uses these and the fine work is simply absent.
 *
 * The two shapes overlap on purpose - the boulder runs behind the hall - which
 * is invisible while both are painted in the same colour, and is why this
 * version is only ever used as a single-colour glyph.
 */
const GLYPH = [
  // The boulder, closed down to the ground and pulled clear of the hall: at
  // icon sizes two touching shapes merge into one hill and the mark stops
  // reading as a bank.
  '<path d="M14 142 L26 100 L42 66 L64 38 L88 32 L104 52 L112 84 L114 112 L113 142 Z" />',

  // The portico, overhanging its columns - the overhang is what says
  // "building" once the detail is gone.
  '<path d="M126 74 L177 37 L228 74 Z" />',
  '<path d="M132 74 H222 V85 H132 Z" />',

  // Five columns. They read as columns at 48px and merge into a solid body at
  // 16px, which is the right answer at both sizes.
  '<path d="M139 85 H150 V120 H139 Z" />',
  '<path d="M156 85 H167 V120 H156 Z" />',
  '<path d="M173 85 H184 V120 H173 Z" />',
  '<path d="M190 85 H201 V120 H190 Z" />',
  '<path d="M207 85 H218 V120 H207 Z" />',

  // Stylobate and the plinth that flares to the ground.
  '<path d="M130 120 H226 V131 H130 Z" />',
  '<path d="M124 131 H232 L238 142 H118 Z" />',
];

/**
 * The filled reduction, as an inline <svg>.
 *
 * `hallOnly` drops the boulder and crops to the hall. At 16 x 16 there is room
 * for one idea, and a portico on columns is the one a person recognises
 * without being told; a boulder that small is a pebble.
 */
function glyph({ height = 32, hallOnly = false, className = '', title = '' } = {}) {
  const box = hallOnly
    ? { x: 112, y: 30, width: 132, height: 120 }
    : { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height };
  const shapes = hallOnly ? GLYPH.slice(1) : GLYPH;
  const width = Math.round((height * box.width) / box.height);
  return `<svg viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${width}" height="${height}"${className ? ` class="${className}"` : ''} fill="currentColor"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>
      ${shapes.join('\n      ')}
    </svg>`;
}

/* ------------------------------------------------------- standalone files -- */

/** A complete SVG document for the mark alone, in one fixed colour. */
function markFile(color = '#11213a', { detail = true, weight = 7, pad = 10 } = {}) {
  const w = VIEWBOX.width + pad * 2;
  const h = VIEWBOX.height + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Rockfield Bank">
  <g transform="translate(${pad} ${pad})" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
    <g stroke-width="${weight}">
      ${HEAVY.join('\n      ')}
    </g>${detail ? `
    <g stroke-width="${Math.max(3.5, weight * 0.62)}">
      ${FINE.join('\n      ')}
    </g>` : ''}
  </g>
</svg>`;
}

/**
 * The stacked wordmark: the mark above ROCKFIELD above BANK, with the two
 * tapered rules either side of BANK that the original artwork carries.
 */
function wordmark(color = '#11213a', subColor) {
  const sub = subColor || color;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340" width="560" height="340" role="img" aria-label="Rockfield Bank">
  <g transform="translate(160 14)" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
    <g stroke-width="7">
      ${HEAVY.join('\n      ')}
    </g>
    <g stroke-width="4.3">
      ${FINE.join('\n      ')}
    </g>
  </g>
  <!-- SVG letter-spacing is added after the final glyph too, so a centred
       string sits half a space to the right of where it looks centred. Both
       lines below are pulled back by half their tracking to correct it. -->
  <text x="277" y="248" text-anchor="middle" fill="${color}"
        font-family="Georgia, 'Liberation Serif', 'Times New Roman', serif"
        font-size="72" letter-spacing="6">ROCKFIELD</text>
  <g stroke="${sub}" stroke-width="3" stroke-linecap="round">
    <path d="M118 296 H196" opacity=".75" />
    <path d="M358 296 H436" opacity=".75" />
  </g>
  <text x="273" y="307" text-anchor="middle" fill="${sub}"
        font-family="Helvetica, 'Liberation Sans', Arial, sans-serif"
        font-size="34" letter-spacing="13">BANK</text>
</svg>`;
}

module.exports = { VIEWBOX, HEAVY, FINE, GLYPH, emblem, glyph, lockup, markFile, wordmark };
