<?php
/*
  Admin-login diagnostics. Open:  https://chub.yeneflow.com/api/diagnose.php
  It checks config.php, the database and the tables, and lets you test a key
  against the server WITHOUT showing the real key. DELETE THIS FILE when done.
*/
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$rows = [];
function row($label, $ok, $detail = '') { global $rows; $rows[] = [$label, $ok, $detail]; }

/* 1. config.php */
$CFG = null; $cfgErr = '';
$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) { $cfgErr = 'api/config.php does not exist on the server.'; }
else {
    try { $CFG = include $cfgFile; if (!is_array($CFG)) { $cfgErr = 'config.php did not return an array.'; $CFG = null; } }
    catch (Throwable $e) { $cfgErr = 'config.php has an error: ' . $e->getMessage(); }
}
row('config.php loads', $CFG !== null, $cfgErr);

$real = $CFG ? (string)($CFG['admin_key'] ?? '') : '';
if ($CFG) {
    row('admin_key is set', $real !== '', $real === '' ? 'Empty — set admin_key in config.php.' : '');
    row('admin_key is 20+ characters', strlen($real) >= 20, 'Length on the server: ' . strlen($real));
    row('admin_key has no stray spaces/newlines', $real === trim($real), $real === trim($real) ? '' : 'Spaces or a line break around the key — remove them (the API now trims them anyway).');
    row('db_pass was filled in', !in_array(($CFG['db_pass'] ?? ''), ['', 'PASTE_YOUR_REAL_DATABASE_PASSWORD_HERE'], true), '');
    $origins = $CFG['allowed_origins'] ?? [];
    row('allowed_origins', !empty($origins), implode(', ', $origins));
}

/* 2. database */
$db = null;
if ($CFG) {
    try {
        $db = new PDO('mysql:host=' . ($CFG['db_host'] ?? 'localhost') . ';dbname=' . ($CFG['db_name'] ?? '') . ';charset=utf8mb4',
            $CFG['db_user'] ?? '', $CFG['db_pass'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        row('Database connection', true, 'Connected to "' . h($CFG['db_name'] ?? '') . '" as "' . h($CFG['db_user'] ?? '') . '".');
    } catch (Throwable $e) {
        $m = $e->getMessage();
        $hint = '';
        if (stripos($m, 'Access denied') !== false) $hint = ' → wrong db_user or db_pass (cPanel usually prefixes both with your account name).';
        elseif (stripos($m, 'Unknown database') !== false) $hint = ' → wrong db_name (check the exact name in cPanel → MySQL Databases).';
        row('Database connection', false, $m . $hint);
    }
}
if ($db) {
    foreach (['items', 'likes', 'comments', 'contacts', 'events', 'rate_limits'] as $t) {
        try { $n = (int)$db->query("SELECT COUNT(*) FROM `$t`")->fetchColumn(); row("Table `$t`", true, "$n rows"); }
        catch (Throwable $e) { row("Table `$t`", false, 'Missing — run api/setup.php?key=YOUR_ADMIN_KEY once.'); }
    }
}

/* 3. test a key */
$testMsg = ''; $testOk = null;
if ($CFG && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $given = trim((string)($_POST['k'] ?? ''));
    $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0') . '|' . ($CFG['salt'] ?? 'x'));
    $locked = false;
    if ($db) {
        try {
            $st = $db->prepare("SELECT COUNT(*) FROM rate_limits WHERE bucket='adminfail' AND ip_hash=? AND created_at > (NOW() - INTERVAL 900 SECOND)");
            $st->execute([$ip]); $locked = (int)$st->fetchColumn() >= 8;
        } catch (Throwable $e) {}
    }
    if ($locked && !empty($_POST['unlock'])) {
        /* allow clearing the lockout only with the correct key */
        if (strlen($real) >= 20 && hash_equals(trim($real), $given)) { $db->prepare("DELETE FROM rate_limits WHERE bucket='adminfail' AND ip_hash=?")->execute([$ip]); $locked = false; $testMsg = 'Lockout cleared.'; }
    }
    if ($locked) { $testMsg = 'This connection is currently locked out after too many wrong keys (15 min). Enter the correct key and tick "clear lockout".'; $testOk = false; }
    else {
        $match = strlen(trim($real)) >= 20 && hash_equals(trim($real), $given);
        $testOk = $match;
        $testMsg = $match
            ? 'MATCH — this key is exactly the admin_key on the server. Use it on /admin/.'
            : 'NO MATCH — you typed ' . strlen($given) . ' characters; the server key has ' . strlen(trim($real)) . '. Open api/config.php in cPanel File Manager and copy the admin_key value between the quotes.';
        if (!$match && $db) { try { $db->prepare("INSERT INTO rate_limits (bucket, ip_hash) VALUES ('adminfail', ?)")->execute([$ip]); } catch (Throwable $e) {} }
    }
}
$allOk = true; foreach ($rows as $r) if (!$r[1]) $allOk = false;
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>API diagnostics</title>
<style>
body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f4f9;color:#17161f;margin:0;padding:1.2rem}
.box{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e3e1ee;border-radius:14px;padding:1.2rem 1.4rem}
h1{font-size:1.25rem;margin:.1rem 0 .8rem} table{width:100%;border-collapse:collapse}
td{padding:.45rem .3rem;border-bottom:1px solid #eee;vertical-align:top;font-size:.9rem} td:first-child{white-space:nowrap;font-weight:600}
.ok{color:#14915f;font-weight:800}.bad{color:#d62b52;font-weight:800}.d{color:#666;word-break:break-word}
input[type=text],input[type=password]{width:100%;padding:.65rem .8rem;border:1px solid #ccc;border-radius:10px;font:inherit;margin:.4rem 0}
button{padding:.6rem 1.2rem;border:0;border-radius:99px;background:#6c4dff;color:#fff;font-weight:700;cursor:pointer}
.msg{padding:.7rem .9rem;border-radius:10px;margin:.8rem 0;font-weight:600}.msg.g{background:#e3f7ee;color:#0d6b47}.msg.r{background:#fde8ed;color:#a3203f}
.warn{background:#fff6e0;border:1px solid #f0d58a;padding:.6rem .8rem;border-radius:10px;font-size:.85rem;margin-top:1rem}
</style></head><body><div class="box">
<h1>Yohan Records — API diagnostics</h1>
<p class="<?= $allOk ? 'ok' : 'bad' ?>"><?= $allOk ? 'Everything the server can check looks good.' : 'Something below needs fixing.' ?></p>
<table><?php foreach ($rows as $r): ?>
<tr><td><?= h($r[0]) ?></td><td class="<?= $r[1] ? 'ok' : 'bad' ?>"><?= $r[1] ? '✔' : '✘' ?></td><td class="d"><?= h($r[2]) ?></td></tr>
<?php endforeach; ?></table>

<h1 style="margin-top:1.4rem">Test your admin key</h1>
<form method="post" autocomplete="off">
  <input type="text" name="k" placeholder="Paste the key you use on /admin/" autocomplete="off" spellcheck="false">
  <label style="font-size:.85rem"><input type="checkbox" name="unlock" value="1"> clear lockout if the key is correct</label><br><br>
  <button type="submit">Test key</button>
</form>
<?php if ($testMsg): ?><div class="msg <?= $testOk ? 'g' : 'r' ?>"><?= h($testMsg) ?></div><?php endif; ?>
<div class="warn"><b>Delete this file</b> (api/diagnose.php) from the server when you are finished. It never shows the key itself, only whether what you typed matches.</div>
</div></body></html>
