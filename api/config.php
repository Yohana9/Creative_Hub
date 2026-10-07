<?php
/*
  Pre-filled with what's already known from our conversation.
  ONLY db_pass still needs your real database password pasted in below —
  everything else here is ready to use as-is, or edit further if you'd like.

  config.php must never be uploaded to GitHub. It is blocked from web access
  by .htaccess (confirm that by visiting /api/config.php in a browser — it
  should say 403 Forbidden, never show this code).
*/
return [
    // From cPanel > MySQL Databases. Double-check these are the exact
    // strings cPanel shows you — some hosts prefix both the database name
    // and username with your cPanel account name (e.g. cpaneluser_CHub).
    'db_host' => 'localhost',
    'db_name' => 'CHub',
    'db_user' => 'CHub_Admin',
    'db_pass' => '5WcWq+s&lTGC?QD4',

    // Your private dashboard key — freshly generated, ready to use.
    // Change it any time you like; just update it here and re-enter it at
    // chub.yeneflow.com/admin/ afterward.
    'admin_key' => 'FQydhqO18Z3mfY6VfdDBkuXKECJNQV0n',

    // Random text used to anonymise visitor/IP hashes — freshly generated.
    // Leave this one alone once the site is live; changing it later makes
    // existing hashed data stop matching.
    'salt' => '77XGjf7Xfnf1zhtggrbCpjw0WWtf3dgu',

    // Websites allowed to call this API (no trailing slash).
    'allowed_origins' => [
        'https://chub.yeneflow.com',
        'https://yohana9.github.io',
    ],

    // Contact form emails arrive here.
    'mail_to'   => 'yohanreta9@gmail.com',
    'mail_from' => 'no-reply@yeneflow.com',   // must be an address on your own domain
    'site_name' => 'Yohan Records',
    'owner_name' => 'Yohannes R.',

    'timezone' => 'Africa/Addis_Ababa',
    'db_timezone' => '+03:00',
    'comments_need_approval' => false,  // true = every new comment waits for your approval
    'trust_cloudflare' => false,        // true only if the domain is behind Cloudflare
    'max_items' => 3000,
];
