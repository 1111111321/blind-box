# Blind Box

A small blind-box site: open a box, take home something small.

Plain HTML, CSS and JavaScript — no framework, no build step, no server, no account. Progress is kept in the browser's `localStorage`.

## Pages

| File | What it does |
|---|---|
| `index.html` | Draw: twelve boxes, draw feedback, result dialog, guarantee counter, site contents |
| `collection.html` | Collection: twelve slots, drawn pieces shown, records can be cleared |
| `odds.html` | Odds and rules: odds per rarity, odds per piece, guarantee and storage rules |
| `about.html` | About: why the site exists, how it is built, accessibility notes, contact |

All four pages share the same header. Navigation is made of real `<a href>` links, not a script-generated menu.

## Structure

```
blind-box/
├── index.html
├── collection.html
├── odds.html
├── about.html
├── style.css        one stylesheet for four pages (colour and spacing are variables)
├── app.js           item data, draw logic, rendering for the three interactive pages
└── favicon.svg
```

## Running it

Open `index.html` in a browser — the pages do not use `fetch`, so no local server is needed.

A server works too: run `python -m http.server 8000` in this folder and open <http://localhost:8000>.

## Where the logic lives

- **Items and odds**: the `ITEMS` and `RARITY` tables at the top of `app.js`. `weight` is the probability weight; the table on `odds.html` is computed from the same numbers.
- **Icons**: `ICONS` holds twelve 48×48 line drawings. They use `currentColor`, so dark mode follows without extra images.
- **A draw**: roll a rarity by weight, then pick one piece from that tier with equal chance.
- **Guarantee**: `PITY = 10`. Ten draws without Epic or better, and the tenth is guaranteed.
- **Twelve per case**: a box never repeats inside the same case; when all twelve are open you can refill, and the collection keeps counting.
- **Storage**: `localStorage` key `xingyu.box.v1`, holding draws, counts per piece, the guarantee counter and recent draws.

## Design notes

An earlier version used gradients, glow, confetti and a lot of motion. It buried the content and did not feel good on a phone. Now:

- one accent colour, everything else carried by type size, spacing and 1px rules;
- two pieces of motion: a nudge when a box opens, a fade for the result;
- rarity shown on a box as a small dot, nothing more;
- dark mode follows the system, colours defined once as CSS variables.

## Accessibility

- Boxes are real `<button>` elements; results are announced through `aria-live`.
- The result dialog uses `role="dialog"`, closes with `Esc`, and returns focus to the box.
- Tables use `<caption>` and `th scope`; there is a "Skip to content" link on every page.
- With `prefers-reduced-motion` set, animations are effectively off.
