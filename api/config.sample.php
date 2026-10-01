<?php
/*
  Copy this file to config.php and fill in your own values.
  config.php must never be uploaded to GitHub. It is blocked from web access by .htaccess.
*/
return [
    // Database details from cPanel > MySQL Databases.
    // cPanel adds your account name in front, for example cpaneluser_creativehub
    'db_host' => 'localhost',
    'db_name' => 'cpaneluser_creativehub',
    'db_user' => 'cpaneluser_hubuser',
    'db_pass' => 'CHANGE_ME',

    // Your private dashboard key. 24+ random characters. Only you know it.
    'admin_key' => 'CHANGE_ME_TO_A_LONG_RANDOM_KEY',

    // Any random text. Used to anonymise visitor and IP hashes. Never change it later.
    'salt' => 'CHANGE_ME_RANDOM_TEXT',

    // Websites allowed to call this API (no trailing slash).
    'allowed_origins' => [
        'https://creativehub.yeneflow.com',
        'https://yohana9.github.io',
    ],

    // Contact form emails arrive here.
    'mail_to'   => 'yohanreta9@gmail.com',
    'mail_from' => 'no-reply@yeneflow.com',   // must be an address on your own domain
    'site_url'  => 'https://chub.yeneflow.com',   // used in confirmation redirects
    'site_name' => 'Yohan Records',
    'owner_name' => 'Yohannes R.',

    'timezone' => 'Africa/Addis_Ababa',
    'db_timezone' => '+03:00',
    'comments_need_approval' => false,  // true = every new comment waits for your approval
    'trust_cloudflare' => false,        // true only if the domain is behind Cloudflare
    'max_items' => 3000,
];
