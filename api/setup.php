<?php
/* One-time installer. Open: setup.php?key=YOUR_ADMIN_KEY   Then DELETE this file from the server. */
require __DIR__ . '/lib.php';
header('Content-Type: text/plain; charset=utf-8');
$key = (string)($_GET['key'] ?? '');
if (strlen((string)cfg('admin_key', '')) < 20 || !hash_equals((string)cfg('admin_key'), $key)) { http_response_code(403); exit("Forbidden. Use ?key=YOUR_ADMIN_KEY\n"); }
$file = __DIR__ . '/schema.sql';
if (!is_readable($file)) exit("schema.sql not found next to setup.php\n");
$db = pdo();
$n = 0;
foreach (preg_split('/;\s*[\r\n]+/', file_get_contents($file)) as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') continue;
    $db->exec($stmt); $n++;
}
echo "OK: $n statements ran. Tables are ready.\nNow delete setup.php from the server.\n";
