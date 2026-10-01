# Yohan Records — v4: dynamic-ready, social features, private dashboard

Everything below `assets/` is still an empty folder skeleton — put your real
audio/image/video files back in the matching folders and every page works.

## Static by default, dynamic when you're ready
The site runs standalone with no server (hearts save on your device, view/play
counts and comments stay hidden, the contact form opens an email draft). Follow
`DEPLOY.md` to connect it to a real cPanel MySQL database on
`chub.yeneflow.com`: after that, plays, views, likes and comments are
counted for real and shown to everyone, and the contact form saves to your
database and emails you.

**To flip it on:** edit `scripts/config.js`, set `API_BASE` to your uploaded
`api/index.php` address. That's the only file you need to touch.

## New in v4

**Sidebar & header**
- Redesigned sidebar: rounded floating panel, icon chips, gradient active state,
  collapses to an icon-only rail on desktop (click the menu button to toggle,
  it remembers your choice) and becomes a slide-out drawer on tablet/phone with
  swipe-to-open/close. Adapts automatically to light and dark theme.
- Dark stays the default theme.

**Responsiveness**
- Breakpoints tuned for large desktop/4K monitors, laptops, tablets, phones,
  short landscape phones, and touch devices (bigger tap targets). Sizes use
  `rem`/`clamp()` throughout instead of fixed pixels.

**Social features (all four: views, likes, comments, shares)**
- Every track, video and gallery piece shows a heart (like), a play/view
  count, a comment count and a share button, YouTube-style. Counts only show
  once the backend is connected; likes still work locally without it.
- A comments drawer slides in from the side (bottom sheet on phones) — name +
  comment, no account needed, with spam protections (honeypot field, a
  minimum-time check, and rate limits) baked into the API.
- A repeat button (off / repeat all / repeat one) and a shuffle button in the
  player, both remembered between visits.
- Search + sort ("Most played", "Most liked", "A–Z") on Singles, Remixes and
  Videos.
- Home page shows live totals (plays, likes, comments, visitors) and a
  trending strip once the database is live.

**Contact page**
- Replaced the newsletter box with a real contact form: full name, email,
  phone, country, city, address, organization, subject and message, validated
  both in the browser and on the server. Submissions are emailed to you and
  saved to the database. Without a backend connected it falls back to opening
  an email draft with the same details.

**Private dashboard**
- `admin/` is a separate page, not linked anywhere on the public site and
  blocked from search engines, protected by the `admin_key` you set in
  `api/config.php` (no visitor accounts, exactly as you asked). It shows:
  totals, a 30/7/90-day activity chart, device/country/browser/referrer
  breakdowns, your most-played tracks and most-watched videos, every contact
  message (search, mark read, delete, export to CSV, reply by email), and
  every comment (hide, delete, reply as the owner).

## Deployment
See `DEPLOY.md` for the full cPanel + MySQL setup, step by step.

## v5: dual-hosting resilience, cleanup, and a calmer palette

- **Automatic online/offline detection.** The site no longer decides "online or
  static" once at page load. Every action checks reachability for itself, so
  running the same files on GitHub Pages and cPanel at once — and having
  cPanel go down and come back — is fully automatic. See `DEPLOY.md` section 5.
- **No more duplicate page titles.** "Albums" / "Albums", "Videos" / "Videos"
  and so on are gone — each page states its name once, in the hero, then goes
  straight into an intro line and the content.
- **Calmer, more professional hero title.** The glow is now a single soft
  brand-colored halo instead of a multi-color neon flicker.
- **Cards** now use one consistent glass surface in both themes instead of the
  original site's loud purple-to-blue gradient.

## v6: brand refresh
- New emblem logo, horizontal lock-up (dark and light versions), full favicon set, web manifest and social share image.
- Home hero is now a split layout with the studio portrait (transparent PNG/WebP) next to the headline.
- Fixed: `api/config.php` was missing from `.gitignore`; hero particles no longer throw if the CDN is blocked; dead `#` social links removed; docs no longer reference files that are not shipped.
