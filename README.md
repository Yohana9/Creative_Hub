# Yohan Records — Creative Hub

Music, film and artwork hub of Yohannes R. A static front end (HTML/CSS/JS) plus a small PHP + MySQL API
for likes, play counts, comments, testimonials, contact messages and a private analytics dashboard.

```
index.html, singles.html, albums.html, remixes.html, Video.html, gallery.html,
Software.html, testimonials.html, contact.html   ← pages
styles/  scripts/  assets/                       ← front end (your audio/images/videos live in assets/)
admin/                                           ← private dashboard (needs the admin key)
api/                                             ← PHP API (runs on cPanel hosting, NOT on GitHub Pages)
```

## 1. Put the website on GitHub Pages (free)

1. Create a repository (for example `YohanRec`) and upload **everything in this folder**, including your own
   `assets/audio`, `assets/images`, `assets/videos` and `assets/gallery` folders.
   * GitHub allows files up to 100 MB each and recommends keeping a site under about 1 GB.
   * `.nojekyll` is included so folders and file names are served as they are.
2. Repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute the site is live at `https://<your-user>.github.io/<repo>/` (for you: `https://yohana9.github.io/YohanRec/`).

All links in the pages are relative, so they work under `/YohanRec/` without changes.

## 2. The API (likes, plays, comments, testimonials, dashboard)

GitHub Pages only serves static files, so the PHP API stays on your cPanel hosting at `https://chub.yeneflow.com/api/`.
`scripts/config.js` already points the site at it:

```js
API_BASE: "https://chub.yeneflow.com/api/index.php"
```

* Upload the `api/` folder to the server. **Do not upload or commit `api/config.php` from here**: it holds your
  database password and admin key. Keep the one that is already on the server (use `api/config.sample.php` as a template).
* In `api/config.php` make sure `allowed_origins` lists every address the site is served from, for example
  `https://chub.yeneflow.com` and `https://yohana9.github.io` (no trailing slash). Without it the browser blocks the API.
* Tables are created automatically the first time they are needed (testimonials, trending pins). `api/schema.sql` has the full schema.

## 3. Dashboard

Open `/admin/` on either site and enter your admin key. You can:

* see plays, likes, views, comments, messages and visitors,
* **pin songs to the Home "Top 10 – Trending"** list and reorder them (the rest fills automatically from recent listening),
* approve, hide or delete testimonials and comments.

## Security checklist

* `api/config.php` is in `.gitignore`. If it was ever pushed, change the database password and `admin_key` right away.
* Delete `api/diagnose.php` from the server when you are done troubleshooting.
* Use a long random `admin_key` (20+ characters).

See `DEPLOY.md` for the cPanel upload steps.
