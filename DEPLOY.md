# Yohan Records — backend (cPanel)

This turns the static site into a dynamic one: play/view counts, likes, comments and
a contact form that saves to a database, plus a private dashboard only you can see.

## 1. Create the database (cPanel)
1. cPanel → **MySQL Databases** → create a database, e.g. `creativehub` (cPanel will
   prefix it, e.g. `cpaneluser_creativehub`).
2. Create a database user with a strong password, and **add it to the database**
   with **All Privileges**.
3. Note the three values: database host (usually `localhost`), full database name,
   full username, and the password.

## This copy already has `api/config.php` filled in
Since you already shared your subdomain, database name and username, this zip
includes `api/config.php` pre-filled with those, plus a freshly generated
`admin_key` and `salt`. The one field still marked `PASTE_YOUR_REAL_DATABASE_PASSWORD_HERE`
is your real database password — that was never shared in full, so open
`api/config.php` after uploading and paste it in yourself. Change the
`admin_key` too if you'd rather pick your own. Skip straight to step 4 once
that one field is filled in — steps 1–3 are already done for you.

## 2. Upload the API
1. In cPanel → **Subdomains**, create `creativehub.yeneflow.com` pointing at a new
   folder, e.g. `creativehub`.
2. Upload the whole **site/** folder (the rest of this zip) into that subdomain's
   folder, so `index.html`, `styles/`, `scripts/`, `assets/`, `admin/` and `api/`
   all sit together at the domain root.
3. Inside `api/`, copy `config.sample.php` to `config.php` and fill in:
   - `db_host`, `db_name`, `db_user`, `db_pass` from step 1
   - `admin_key`: any long random string (20+ characters) — this is your private
     password for the dashboard. Keep it secret.
   - `salt`: any other random text. Set it once and never change it.
   - `allowed_origins`: the exact address(es) the site will be served from
     (already filled in for `creativehub.yeneflow.com`)
   - `mail_to` / `mail_from`: where contact messages are emailed. `mail_from`
     should be an address on your own domain (e.g. `no-reply@yeneflow.com`) or
     some mail servers will reject it.
4. `config.php` is blocked from being viewed in a browser by `api/.htaccess`.
   Never rename it to `config.sample.php` or move it out of `api/`.

## 3. Create the tables
Visit once, in your browser:
```
https://creativehub.yeneflow.com/api/setup.php?key=YOUR_ADMIN_KEY
```
It should say `OK: ... statements ran`. **Then delete `api/setup.php` from the
server** (cPanel File Manager) — it's only needed once.

## 4. Turn the site on
Open `scripts/config.js` and set:
```js
window.YR_CONFIG = {
  API_BASE: "https://creativehub.yeneflow.com/api/index.php",
  OWNER_EMAIL: "yohanreta9@gmail.com",
  SITE_NAME: "Yohan Records"
};
```
Reload the site. Play counts, likes, comments and the contact form now save to
your database.

## 5. Run it in two places at once (GitHub Pages + cPanel)
This is the setup you asked for: the exact same `site/` folder, with the exact
same `scripts/config.js` (API_BASE already pointing at your cPanel domain),
deployed to **both** places:

- **cPanel** (`creativehub.yeneflow.com`) — serves the pages *and* the API.
- **GitHub Pages** (`https://yohana9.github.io/...`) — serves only the static
  pages; its JavaScript calls out to the same cPanel API over the internet.
  `api/config.php`'s `allowed_origins` already includes your GitHub Pages
  address so the browser allows this.

Both copies talk to the same database, so a like, a comment, or a play counted
on one shows up on the other. If your cPanel subscription lapses and the API
goes offline, **both** copies notice automatically (every request checks
reachability on its own — nothing is decided once at page load) and fall back
to static behavior: hearts save on the visitor's device only, view/comment
counts and the comment button hide themselves, and the contact form opens an
email draft instead of failing. Nothing breaks, nothing shows an error banner.
When you resubscribe and the API is back, the very next visit (or the next
click) reconnects on its own — no redeploy, no code change, on either copy.

If you'd rather test safely first, deploy to GitHub Pages with `API_BASE` left
empty (pure static preview), then fill it in and push again once the cPanel
side is ready — or just deploy both from day one and let the automatic
fallback handle any gap.

## 6. Open your dashboard
Go to `https://creativehub.yeneflow.com/admin/` and enter your admin key. This
page is not linked from the public site and is blocked from search engines
(`robots.txt` and a `noindex` tag), but the key is what actually protects it —
keep it private. There is no separate login system by design, as you asked.

## Notes
- Comments are shown immediately by default. Set `comments_need_approval` to
  `true` in `config.php` if you'd rather approve each one first from the
  dashboard.
- The API only accepts requests from the domains listed in `allowed_origins`,
  rate-limits likes/comments/contact messages per visitor, and never stores
  raw IP addresses — only a one-way hash, so you can rate-limit abuse without
  keeping personal data.
- If you ever need to reset everything, you can re-run `setup.php` after
  restoring it (the tables use `CREATE TABLE IF NOT EXISTS`, so it won't erase
  existing data — to fully reset, drop the tables from phpMyAdmin first).

## Troubleshooting the admin login
- Open `https://chub.yeneflow.com/api/diagnose.php` — it checks `config.php`, the database and the tables, and can test your admin key without revealing it. **Delete `api/diagnose.php` when finished.**
- Always open the dashboard from the same domain as the API (`https://chub.yeneflow.com/admin/`). From any other domain, add that exact address to `allowed_origins` in `api/config.php`.
- The dashboard is light by default; use the ☾/☀ button to switch.

## Admin login — final notes
- Open the dashboard at `https://chub.yeneflow.com/admin/` (same domain as the API).
- The login retries automatically (3 attempts, 20 s each) on a flaky connection. "Couldn't get an answer" means a network/DNS/server problem; "Invalid key" means the key is wrong.
- Change `admin_key` in `api/config.php` to rotate your key (use 20+ random characters, no spaces).
- Delete `api/diagnose.php` from the server once everything works.

## New in this version
- **Home "Trending now" = Top 10.** Pinned songs (dashboard → *Home Top 10*) come first, the remaining places fill automatically:
  score = 2 × plays in the last 7 days + plays in the last 30 days; ties go to the most recently played song.
- **Testimonials** page + dashboard moderation (new ones wait for approval; set `'testimonials_need_approval' => false` to publish instantly).
- **Logo & favicons** are in the project root (`favicon.ico`, `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`,
  `android-chrome-*.png`, `site.webmanifest`, `og-image.png`) and `assets/images/Logo/` (`YR.png`, `YR.svg`, `Blogo22.png`).
- `api/config.php` is **not** inside the zip on purpose. Keep the one on your server.
