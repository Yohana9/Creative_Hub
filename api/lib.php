<?php
/* Shared helpers for the Yohan Records API. PHP 7.4 or newer. */

$CFG = require __DIR__ . '/config.php';
date_default_timezone_set($CFG['timezone'] ?? 'UTC');

function cfg($k, $d = null) { global $CFG; return array_key_exists($k, $CFG) ? $CFG[$k] : $d; }

function send_cors() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, cfg('allowed_origins', []), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, X-Visitor, X-Admin-Key');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Max-Age: 86400');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}

function out($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail($msg, $code = 400) { out(['error' => $msg], $code); }

function body() {
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input');
        $j = json_decode($raw ? $raw : '', true);
        $b = is_array($j) ? $j : [];
    }
    return $b;
}

function pdo() {
    static $db = null;
    if ($db === null) {
        try {
            $db = new PDO(
                'mysql:host=' . cfg('db_host', 'localhost') . ';dbname=' . cfg('db_name') . ';charset=utf8mb4',
                cfg('db_user'), cfg('db_pass'),
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
            );
            $db->exec("SET time_zone = '" . cfg('db_timezone', '+00:00') . "'");
        } catch (Exception $e) {
            fail('Database connection failed. Check config.php.', 500);
        }
    }
    return $db;
}

function client_ip() {
    if (cfg('trust_cloudflare') && !empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
function ip_hash() { return hash('sha256', client_ip() . '|' . cfg('salt', 'x')); }
function vhash() {
    $v = $_SERVER['HTTP_X_VISITOR'] ?? '';
    if ($v === '') { $b = body(); $v = isset($b['vid']) ? (string)$b['vid'] : ''; }
    $v = preg_replace('/[^a-fA-F0-9-]/', '', $v);
    if (strlen($v) < 8 || strlen($v) > 64) fail('Missing visitor id.', 400);
    return hash('sha256', $v . '|' . cfg('salt', 'x'));
}

function rate_limit($bucket, $max, $windowSec) {
    $db = pdo(); $ip = ip_hash(); $w = (int)$windowSec;
    $st = $db->prepare("SELECT COUNT(*) FROM rate_limits WHERE bucket = ? AND ip_hash = ? AND created_at > (NOW() - INTERVAL $w SECOND)");
    $st->execute([$bucket, $ip]);
    if ((int)$st->fetchColumn() >= $max) fail('Too many requests. Please wait a moment and try again.', 429);
    $db->prepare("INSERT INTO rate_limits (bucket, ip_hash) VALUES (?, ?)")->execute([$bucket, $ip]);
    if (mt_rand(1, 60) === 1) $db->exec("DELETE FROM rate_limits WHERE created_at < (NOW() - INTERVAL 1 DAY)");
}

function valid_key($k) {
    if (!is_string($k) || $k === '' || strlen($k) > 190 || strpos($k, '..') !== false) return false;
    if (preg_match('#^page:[A-Za-z0-9_.\-]{1,60}$#', $k)) return true;
    return (bool)preg_match('#^assets/(audio|videos|images|gallery)/[\p{L}\p{N} _\-./()&,\'@+|\#]{1,170}$#u', $k);
}
function kind_guess($k) {
    if (strpos($k, 'page:') === 0) return 'page';
    if (strpos($k, 'assets/audio/') === 0) return 'audio';
    if (strpos($k, 'assets/videos/') === 0) return 'video';
    return 'image';
}
function clean_kind($kind, $key) {
    return in_array($kind, ['audio', 'video', 'image', 'page'], true) ? $kind : kind_guess($key);
}
function clean_text($s, $max) {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$s);
    $s = trim(strip_tags($s));
    return mb_substr($s, 0, $max);
}

function ensure_item($key, $kind, $title) {
    if (!valid_key($key)) fail('Invalid item.', 400);
    $root = dirname(__DIR__); // when the API sits beside the site, only real files may become items
    if (is_dir($root . '/assets') && !is_file($root . '/' . $key)) fail('Invalid item.', 400);
    $db = pdo();
    $st = $db->prepare("SELECT 1 FROM items WHERE item_key = ?");
    $st->execute([$key]);
    if ($st->fetchColumn()) return;
    $n = (int)$db->query("SELECT COUNT(*) FROM items")->fetchColumn();
    if ($n >= (int)cfg('max_items', 3000)) fail('Item limit reached.', 429);
    $db->prepare("INSERT IGNORE INTO items (item_key, kind, title) VALUES (?, ?, ?)")
       ->execute([$key, clean_kind($kind, $key), clean_text($title, 190)]);
}

function parse_ua() {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (preg_match('/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i', $ua)) $dev = 'tablet';
    elseif (preg_match('/Mobi|iPhone|iPod|Android/i', $ua)) $dev = 'mobile';
    else $dev = 'desktop';
    if (preg_match('/Edg\//', $ua)) $br = 'Edge';
    elseif (preg_match('/OPR\/|Opera/', $ua)) $br = 'Opera';
    elseif (preg_match('/Firefox\//', $ua)) $br = 'Firefox';
    elseif (preg_match('/Chrome\//', $ua)) $br = 'Chrome';
    elseif (preg_match('/Safari\//', $ua)) $br = 'Safari';
    else $br = 'Other';
    return [$dev, $br];
}

function admin_key_given() {
    $g = (string)($_SERVER['HTTP_X_ADMIN_KEY'] ?? $_SERVER['REDIRECT_HTTP_X_ADMIN_KEY'] ?? '');
    if ($g === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $n => $v) { if (strcasecmp($n, 'X-Admin-Key') === 0) { $g = (string)$v; break; } }
    }
    return trim($g);
}

function require_admin() {
    $real = trim((string)cfg('admin_key', ''));
    if (strlen($real) < 20) fail('Set a longer admin_key (20+ characters) in config.php.', 503);
    $db = pdo(); $ip = ip_hash();
    $st = $db->prepare("SELECT COUNT(*) FROM rate_limits WHERE bucket = 'adminfail' AND ip_hash = ? AND created_at > (NOW() - INTERVAL 900 SECOND)");
    $st->execute([$ip]);
    $fails = (int)$st->fetchColumn();
    if ($fails >= 8) fail('Too many wrong keys. Try again in 15 minutes.', 429);
    $given = admin_key_given();
    if ($given === '' || !hash_equals($real, $given)) {
        $db->prepare("INSERT INTO rate_limits (bucket, ip_hash) VALUES ('adminfail', ?)")->execute([$ip]);
        fail('Invalid key. ' . max(0, 7 - $fails) . ' tries left before a 15-minute pause.', 401);
    }
}

function iso($dt) { return $dt ? date('c', strtotime($dt)) : null; }

function csv_safe($v) { return (is_string($v) && preg_match('/^[=+\-@\t\r]/', $v)) ? "'" . $v : $v; }
