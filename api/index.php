<?php
/* Yohan Records API. One entry point: index.php?action=NAME */
require __DIR__ . '/lib.php';
send_cors();

$action = $_GET['action'] ?? '';
$map = [
    'ping' => 'act_ping', 'stats' => 'act_stats', 'top' => 'act_top', 'track' => 'act_track', 'react' => 'act_react',
    'comments' => 'act_comments', 'comment' => 'act_comment', 'contact' => 'act_contact', 'testimonials' => 'act_testimonials', 'testimonial_submit' => 'act_testimonial_submit', 'testimonial_confirm' => 'act_testimonial_confirm',
    'admin_overview' => 'adm_overview', 'admin_items' => 'adm_items', 'admin_item_delete' => 'adm_item_delete',
    'admin_comments' => 'adm_comments', 'admin_comment_update' => 'adm_comment_update',
    'admin_contacts' => 'adm_contacts', 'admin_contact_update' => 'adm_contact_update', 'admin_export' => 'adm_export', 'admin_testimonials' => 'adm_testimonials', 'admin_testimonial_update' => 'adm_testimonial_update',
];
if (!isset($map[$action])) fail('Unknown action.', 404);
call_user_func($map[$action]);

/* ------------------------------------------------------------------ public */

function act_ping() { out(['ok' => true, 'time' => date('c')]); }

function act_stats() {
    $b = body();
    $keys = isset($b['keys']) && is_array($b['keys']) ? $b['keys'] : [];
    $keys = array_values(array_unique(array_filter(array_map('strval', $keys), 'valid_key')));
    $keys = array_slice($keys, 0, 300);
    $db = pdo(); $items = []; $mine = [];
    if ($keys) {
        $in = implode(',', array_fill(0, count($keys), '?'));
        $st = $db->prepare("SELECT item_key, plays, views, likes, comments, shares FROM items WHERE item_key IN ($in)");
        $st->execute($keys);
        foreach ($st as $r) {
            $items[$r['item_key']] = ['plays' => (int)$r['plays'], 'views' => (int)$r['views'], 'likes' => (int)$r['likes'],
                                      'comments' => (int)$r['comments'], 'shares' => (int)$r['shares']];
        }
        $st = $db->prepare("SELECT item_key FROM likes WHERE vhash = ? AND item_key IN ($in)");
        $st->execute(array_merge([vhash()], $keys));
        $mine = $st->fetchAll(PDO::FETCH_COLUMN);
    }
    $t = $db->query("SELECT COALESCE(SUM(plays),0) p, COALESCE(SUM(CASE WHEN kind <> 'page' THEN views ELSE 0 END),0) v,
                            COALESCE(SUM(likes),0) l, COALESCE(SUM(comments),0) c FROM items")->fetch();
    $vis = (int)$db->query("SELECT COUNT(DISTINCT vhash) FROM events")->fetchColumn();
    out(['items' => (object)$items, 'mine' => $mine,
         'totals' => ['plays' => (int)$t['p'], 'views' => (int)$t['v'], 'likes' => (int)$t['l'], 'comments' => (int)$t['c'], 'visitors' => $vis]]);
}

function act_top() {
    $kind = $_GET['kind'] ?? 'audio';
    if (!in_array($kind, ['audio', 'video', 'image'], true)) $kind = 'audio';
    $limit = max(1, min(20, (int)($_GET['limit'] ?? 6)));
    $col = $kind === 'audio' ? 'plays' : 'views';
    $st = pdo()->prepare("SELECT item_key, title, plays, views, likes, comments FROM items WHERE kind = ? AND $col > 0 ORDER BY $col DESC, likes DESC LIMIT $limit");
    $st->execute([$kind]);
    $rows = [];
    foreach ($st as $r) $rows[] = ['key' => $r['item_key'], 'title' => $r['title'], 'plays' => (int)$r['plays'], 'views' => (int)$r['views'],
                                   'likes' => (int)$r['likes'], 'comments' => (int)$r['comments']];
    out(['items' => $rows]);
}

function act_track() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    $b = body();
    $key = (string)($b['key'] ?? ''); $event = (string)($b['event'] ?? '');
    if (!in_array($event, ['play', 'view', 'share'], true)) fail('Bad event.', 400);
    if (!valid_key($key)) fail('Invalid item.', 400);
    rate_limit('track', 150, 60);
    $vh = vhash(); $db = pdo();
    ensure_item($key, (string)($b['kind'] ?? ''), (string)($b['title'] ?? ''));
    $mins = $event === 'share' ? 5 : 30;
    $st = $db->prepare("SELECT 1 FROM events WHERE vhash = ? AND item_key = ? AND event_type = ? AND created_at > (NOW() - INTERVAL $mins MINUTE) LIMIT 1");
    $st->execute([$vh, $key, $event]);
    if ($st->fetchColumn()) out(['ok' => true, 'counted' => false]);
    list($dev, $br) = parse_ua();
    $cc = strtoupper((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''));
    if (!preg_match('/^[A-Z]{2}$/', $cc) || $cc === 'XX') $cc = null;
    $ref = preg_replace('/[^a-z0-9.\-]/i', '', (string)($b['ref'] ?? ''));
    $ref = $ref !== '' ? substr($ref, 0, 120) : null;
    $db->prepare("INSERT INTO events (item_key, event_type, vhash, device, browser, country, referrer) VALUES (?,?,?,?,?,?,?)")
       ->execute([$key, $event, $vh, $dev, $br, $cc, $ref]);
    $col = $event === 'play' ? 'plays' : ($event === 'share' ? 'shares' : 'views');
    $db->prepare("UPDATE items SET $col = $col + 1, last_event_at = NOW() WHERE item_key = ?")->execute([$key]);
    out(['ok' => true, 'counted' => true]);
}

function act_react() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    $b = body(); $key = (string)($b['key'] ?? ''); $on = !empty($b['on']);
    if (!valid_key($key)) fail('Invalid item.', 400);
    rate_limit('react', 60, 60);
    $vh = vhash(); $db = pdo();
    ensure_item($key, (string)($b['kind'] ?? ''), (string)($b['title'] ?? ''));
    if ($on) {
        $st = $db->prepare("INSERT IGNORE INTO likes (item_key, vhash) VALUES (?, ?)");
        $st->execute([$key, $vh]);
        if ($st->rowCount() === 1) $db->prepare("UPDATE items SET likes = likes + 1 WHERE item_key = ?")->execute([$key]);
    } else {
        $st = $db->prepare("DELETE FROM likes WHERE item_key = ? AND vhash = ?");
        $st->execute([$key, $vh]);
        if ($st->rowCount() === 1) $db->prepare("UPDATE items SET likes = GREATEST(likes - 1, 0) WHERE item_key = ?")->execute([$key]);
    }
    $st = $db->prepare("SELECT likes FROM items WHERE item_key = ?");
    $st->execute([$key]);
    out(['ok' => true, 'liked' => $on, 'likes' => (int)$st->fetchColumn()]);
}

function act_comments() {
    $key = (string)($_GET['key'] ?? '');
    if (!valid_key($key)) fail('Invalid item.', 400);
    $db = pdo();
    $st = $db->prepare("SELECT id, parent_id, author, body, is_owner, created_at FROM comments WHERE item_key = ? AND status = 'visible' ORDER BY id DESC LIMIT 300");
    $st->execute([$key]);
    $rows = []; $total = 0;
    foreach ($st as $r) {
        if (!$r['parent_id']) $total++;
        $rows[] = ['id' => (int)$r['id'], 'parent_id' => $r['parent_id'] ? (int)$r['parent_id'] : null, 'author' => $r['author'],
                   'body' => $r['body'], 'is_owner' => (bool)$r['is_owner'], 'created_at' => iso($r['created_at'])];
    }
    out(['comments' => $rows, 'total' => $total]);
}

function act_comment() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    $b = body(); $key = (string)($b['key'] ?? '');
    if (!valid_key($key)) fail('Invalid item.', 400);
    if (!empty($b['website'])) out(['ok' => true, 'pending' => true]); // honeypot: pretend success
    $t = (int)($b['t'] ?? 0);
    if ($t > 0 && ($d = microtime(true) * 1000 - $t) >= 0 && $d < 2500) fail('That was quick. Please try again.', 429);
    $name = clean_text($b['name'] ?? '', 40); $text = clean_text($b['body'] ?? '', 600);
    if (mb_strlen($name) < 2) fail('Please enter your name.', 400);
    if (mb_strlen($text) < 2) fail('Write a comment first.', 400);
    if (preg_match_all('#https?://|www\.#i', $text) > 1) fail('Please keep at most one link in a comment.', 400);
    rate_limit('comment', 6, 600);
    $db = pdo(); $ih = ip_hash();
    $st = $db->prepare("SELECT 1 FROM comments WHERE ip_hash = ? AND body = ? AND created_at > (NOW() - INTERVAL 10 MINUTE) LIMIT 1");
    $st->execute([$ih, $text]);
    if ($st->fetchColumn()) fail('You already posted that comment.', 409);
    ensure_item($key, (string)($b['kind'] ?? ''), (string)($b['title'] ?? ''));
    $pending = (bool)cfg('comments_need_approval', false);
    $db->prepare("INSERT INTO comments (item_key, author, body, status, ip_hash) VALUES (?,?,?,?,?)")
       ->execute([$key, $name, $text, $pending ? 'pending' : 'visible', $ih]);
    if (!$pending) recount_comments($key);
    out(['ok' => true, 'pending' => $pending]);
}

function recount_comments($key) {
    pdo()->prepare("UPDATE items SET comments = (SELECT COUNT(*) FROM comments WHERE item_key = ? AND status = 'visible' AND parent_id IS NULL) WHERE item_key = ?")
         ->execute([$key, $key]);
}

function act_contact() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    $b = body();
    if (!empty($b['website'])) out(['ok' => true, 'id' => 0, 'emailed' => false]); // honeypot
    $t = (int)($b['t'] ?? 0);
    if ($t > 0 && ($d = microtime(true) * 1000 - $t) >= 0 && $d < 3000) fail('That was quick. Please review the form and send again.', 429);
    $f = [];
    foreach (['full_name' => 120, 'email' => 160, 'phone' => 40, 'country' => 80, 'city' => 80, 'address' => 255, 'organization' => 120, 'subject' => 80] as $k => $max) {
        $f[$k] = str_replace(["\r", "\n"], ' ', clean_text($b[$k] ?? '', $max));
    }
    $f['message'] = clean_text($b['message'] ?? '', 4000);
    if (mb_strlen($f['full_name']) < 2) fail('Please enter your full name.');
    if (!filter_var($f['email'], FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
    if (!preg_match('/^[0-9+()\-.\s]{6,40}$/', $f['phone'])) fail('Enter a valid phone number.');
    if ($f['country'] === '' || mb_strlen($f['city']) < 2 || mb_strlen($f['address']) < 5) fail('Please complete your country, city and address.');
    if ($f['subject'] === '') fail('Choose a subject.');
    if (mb_strlen($f['message']) < 10) fail('Please write a longer message.');
    if (empty($b['consent'])) fail('Please agree to be contacted.');
    rate_limit('contact', 4, 3600);
    $db = pdo();
    $db->prepare("INSERT INTO contacts (full_name, email, phone, country, city, address, organization, subject, message, ip_hash, user_agent)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?)")
       ->execute([$f['full_name'], $f['email'], $f['phone'], $f['country'], $f['city'], $f['address'], $f['organization'] ?: null,
                  $f['subject'], $f['message'], ip_hash(), mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255)]);
    $id = (int)$db->lastInsertId();

    $site = cfg('site_name', 'Website');
    $subject = "[$site] New message #$id: " . $f['subject'];
    $lines = ["New contact message #$id", str_repeat('-', 32),
        'Name: ' . $f['full_name'], 'Email: ' . $f['email'], 'Phone: ' . $f['phone'], 'Country: ' . $f['country'],
        'City: ' . $f['city'], 'Address: ' . $f['address'], 'Organization: ' . ($f['organization'] ?: 'n/a'),
        'Subject: ' . $f['subject'], str_repeat('-', 32), $f['message'], '', 'Sent: ' . date('Y-m-d H:i')];
    $headers = 'From: ' . $site . ' <' . cfg('mail_from', 'no-reply@localhost') . ">\r\n"
             . 'Reply-To: ' . $f['full_name'] . ' <' . $f['email'] . ">\r\n"
             . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: PHP";
    $sent = @mail(cfg('mail_to'), '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), $headers);
    out(['ok' => true, 'id' => $id, 'emailed' => (bool)$sent]);
}

/* ------------------------------------------------------------------- admin */

function adm_overview() {
    require_admin();
    $days = max(7, min(90, (int)($_GET['days'] ?? 30)));
    $db = pdo();
    $since = "(CURDATE() - INTERVAL " . ($days - 1) . " DAY)";
    $t = $db->query("SELECT COALESCE(SUM(plays),0) p, COALESCE(SUM(CASE WHEN kind<>'page' THEN views ELSE 0 END),0) v,
                            COALESCE(SUM(likes),0) l, COALESCE(SUM(comments),0) c, COALESCE(SUM(shares),0) s,
                            SUM(kind<>'page') n FROM items")->fetch();
    $unread = (int)$db->query("SELECT COUNT(*) FROM contacts WHERE is_read = 0")->fetchColumn();
    $pending = (int)$db->query("SELECT COUNT(*) FROM comments WHERE status = 'pending'")->fetchColumn();
    $vis = (int)$db->query("SELECT COUNT(DISTINCT vhash) FROM events WHERE created_at >= (NOW() - INTERVAL $days DAY)")->fetchColumn();
    $visAll = (int)$db->query("SELECT COUNT(DISTINCT vhash) FROM events")->fetchColumn();

    $map = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime("-$i day"));
        $map[$d] = ['date' => $d, 'plays' => 0, 'views' => 0, 'visits' => 0, 'visitors' => 0, 'likes' => 0, 'comments' => 0];
    }
    $q = $db->query("SELECT DATE(created_at) d, SUM(event_type='play') plays, SUM(event_type='view' AND item_key NOT LIKE 'page:%') views,
                            SUM(event_type='view' AND item_key LIKE 'page:%') visits, COUNT(DISTINCT vhash) visitors
                     FROM events WHERE created_at >= $since GROUP BY DATE(created_at)");
    foreach ($q as $r) if (isset($map[$r['d']])) {
        $map[$r['d']]['plays'] = (int)$r['plays']; $map[$r['d']]['views'] = (int)$r['views'];
        $map[$r['d']]['visits'] = (int)$r['visits']; $map[$r['d']]['visitors'] = (int)$r['visitors'];
    }
    foreach ([['likes', 'likes'], ['comments', 'comments']] as $p) {
        $q = $db->query("SELECT DATE(created_at) d, COUNT(*) c FROM {$p[0]} WHERE created_at >= $since GROUP BY DATE(created_at)");
        foreach ($q as $r) if (isset($map[$r['d']])) $map[$r['d']][$p[1]] = (int)$r['c'];
    }

    $top = function ($kind, $col, $n) use ($db) {
        $st = $db->prepare("SELECT item_key, title, plays, views, likes, comments FROM items WHERE kind = ? ORDER BY $col DESC, likes DESC LIMIT $n");
        $st->execute([$kind]);
        return $st->fetchAll();
    };
    $group = function ($col) use ($db, $since) {
        return $db->query("SELECT $col AS label, COUNT(*) AS n FROM events WHERE $col IS NOT NULL AND $col <> '' AND created_at >= $since
                           GROUP BY $col ORDER BY n DESC LIMIT 8")->fetchAll();
    };
    $recentContacts = $db->query("SELECT id, full_name, subject, country, is_read, created_at FROM contacts ORDER BY id DESC LIMIT 6")->fetchAll();
    $recentComments = $db->query("SELECT c.id, c.author, c.body, c.status, c.created_at, i.title FROM comments c
                                  LEFT JOIN items i ON i.item_key = c.item_key ORDER BY c.id DESC LIMIT 6")->fetchAll();
    out(['days' => $days,
         'totals' => ['plays' => (int)$t['p'], 'views' => (int)$t['v'], 'likes' => (int)$t['l'], 'comments' => (int)$t['c'],
                      'shares' => (int)$t['s'], 'items' => (int)$t['n'], 'unread' => $unread, 'pending' => $pending,
                      'visitors' => $vis, 'visitors_all' => $visAll],
         'series' => array_values($map),
         'top_audio' => $top('audio', 'plays', 8), 'top_video' => $top('video', 'views', 6), 'top_image' => $top('image', 'views', 6),
         'devices' => $group('device'), 'browsers' => $group('browser'), 'referrers' => $group('referrer'), 'countries' => $group('country'),
         'recent_contacts' => $recentContacts, 'recent_comments' => $recentComments]);
}

function adm_items() {
    require_admin();
    $rows = pdo()->query("SELECT item_key, kind, title, plays, views, likes, comments, shares, created_at, last_event_at
                          FROM items ORDER BY (plays + views) DESC, likes DESC LIMIT 1500")->fetchAll();
    out(['items' => $rows]);
}

function adm_item_delete() {
    require_admin();
    $key = (string)(body()['key'] ?? '');
    if (!valid_key($key)) fail('Invalid item.');
    $db = pdo();
    foreach (['events', 'likes', 'comments', 'items'] as $t) $db->prepare("DELETE FROM $t WHERE item_key = ?")->execute([$key]);
    out(['ok' => true]);
}

function adm_comments() {
    require_admin();
    $status = $_GET['status'] ?? '';
    $sql = "SELECT c.id, c.item_key, c.parent_id, c.author, c.body, c.is_owner, c.status, c.created_at, i.title
            FROM comments c LEFT JOIN items i ON i.item_key = c.item_key";
    $args = [];
    if (in_array($status, ['visible', 'pending', 'hidden'], true)) { $sql .= " WHERE c.status = ?"; $args[] = $status; }
    $st = pdo()->prepare($sql . " ORDER BY c.id DESC LIMIT 300");
    $st->execute($args);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { $r['created_at'] = iso($r['created_at']); $r['is_owner'] = (bool)$r['is_owner']; }
    out(['comments' => $rows]);
}

function adm_comment_update() {
    require_admin();
    $b = body(); $id = (int)($b['id'] ?? 0); $act = (string)($b['action'] ?? '');
    $db = pdo();
    $st = $db->prepare("SELECT * FROM comments WHERE id = ?"); $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) fail('Comment not found.', 404);
    if ($act === 'hide' || $act === 'show') {
        $db->prepare("UPDATE comments SET status = ? WHERE id = ?")->execute([$act === 'hide' ? 'hidden' : 'visible', $id]);
    } elseif ($act === 'delete') {
        $db->prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?")->execute([$id, $id]);
    } elseif ($act === 'reply') {
        $text = clean_text($b['body'] ?? '', 600);
        if (mb_strlen($text) < 1) fail('Write a reply first.');
        $parent = $c['parent_id'] ? (int)$c['parent_id'] : $id;
        $db->prepare("INSERT INTO comments (item_key, parent_id, author, body, is_owner, status, ip_hash) VALUES (?,?,?,?,1,'visible','owner')")
           ->execute([$c['item_key'], $parent, cfg('owner_name', 'Owner'), $text]);
    } else fail('Unknown action.');
    recount_comments($c['item_key']);
    out(['ok' => true]);
}

function adm_contacts() {
    require_admin();
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') {
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
        $st = pdo()->prepare("SELECT * FROM contacts WHERE full_name LIKE ? OR email LIKE ? OR subject LIKE ? OR country LIKE ? OR message LIKE ? ORDER BY id DESC LIMIT 300");
        $st->execute([$like, $like, $like, $like, $like]);
    } else {
        $st = pdo()->query("SELECT * FROM contacts ORDER BY id DESC LIMIT 300");
    }
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { unset($r['ip_hash']); $r['is_read'] = (bool)$r['is_read']; $r['created_at'] = iso($r['created_at']); }
    out(['contacts' => $rows]);
}

function adm_contact_update() {
    require_admin();
    $b = body(); $id = (int)($b['id'] ?? 0); $act = (string)($b['action'] ?? '');
    $db = pdo();
    if ($act === 'read' || $act === 'unread') $db->prepare("UPDATE contacts SET is_read = ? WHERE id = ?")->execute([$act === 'read' ? 1 : 0, $id]);
    elseif ($act === 'delete') $db->prepare("DELETE FROM contacts WHERE id = ?")->execute([$id]);
    else fail('Unknown action.');
    out(['ok' => true]);
}

function adm_export() {
    require_admin();
    $rows = pdo()->query("SELECT id, created_at, full_name, email, phone, country, city, address, organization, subject, message, is_read FROM contacts ORDER BY id DESC")->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Cache-Control: no-store');
    $o = fopen('php://output', 'w');
    fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, ['id', 'received', 'full_name', 'email', 'phone', 'country', 'city', 'address', 'organization', 'subject', 'message', 'read']);
    foreach ($rows as $r) fputcsv($o, array_map('csv_safe', $r));
    fclose($o);
    exit;
}


/* ------------------------------------------------------------ testimonials */

function tst_table() {
    static $done = false;
    if ($done) return;
    $done = true;
    pdo()->exec("CREATE TABLE IF NOT EXISTS testimonials (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(160) NOT NULL,
        city VARCHAR(80) NULL,
        rating TINYINT UNSIGNED NULL,
        body TEXT NOT NULL,
        status ENUM('unconfirmed','pending','approved','hidden') NOT NULL DEFAULT 'unconfirmed',
        token_hash CHAR(64) NULL,
        token_expires DATETIME NULL,
        verified_at DATETIME NULL,
        ip_hash CHAR(64) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_status (status, id),
        KEY idx_email (email),
        KEY idx_token (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

/* Returns an error message, or '' when the address looks real (format, throw-away list, DNS can receive mail). */
function tst_email_ok($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return 'Enter a valid email address.';
    $domain = strtolower(substr(strrchr($email, '@'), 1));
    $blocked = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com', 'maildrop.cc'];
    if (in_array($domain, $blocked, true)) return 'Please use a permanent email address, not a temporary one.';
    if (function_exists('checkdnsrr') && strpos($domain, '.') !== false) {
        $ok = @checkdnsrr($domain . '.', 'MX') || @checkdnsrr($domain . '.', 'A') || @checkdnsrr($domain . '.', 'AAAA');
        if (!$ok) return 'That email domain does not seem to receive mail. Please check the spelling.';
    }
    return '';
}

function tst_mail($to, $subject, $text) {
    $site = cfg('site_name', 'Website');
    $headers = 'From: ' . $site . ' <' . cfg('mail_from', 'no-reply@localhost') . ">\r\n"
             . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: PHP";
    return (bool)@mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers);
}

/* Public display name: first name plus last initial. The email is never exposed. */
function tst_public_name($name) {
    $p = preg_split('/\s+/u', trim((string)$name));
    $first = $p[0] ?? '';
    if (count($p) > 1) { $last = end($p); $first .= ' ' . mb_strtoupper(mb_substr($last, 0, 1)) . '.'; }
    return $first;
}

function act_testimonial_submit() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    $b = body();
    if (!empty($b['hp_site']) || !empty($b['website'])) out(['ok' => true, 'emailed' => true]); // honeypot
    $t = (int)($b['t'] ?? 0);
    if ($t > 0 && ($d = microtime(true) * 1000 - $t) >= 0 && $d < 4000) fail('That was quick. Please review your testimonial and send again.', 429);
    $name  = str_replace(["\r", "\n"], ' ', clean_text($b['name'] ?? '', 60));
    $email = strtolower(str_replace(["\r", "\n", ' '], '', clean_text($b['email'] ?? '', 160)));
    $city  = str_replace(["\r", "\n"], ' ', clean_text($b['city'] ?? '', 60));
    $text  = clean_text($b['body'] ?? '', 600);
    $rating = (int)($b['rating'] ?? 0);
    if ($rating < 0 || $rating > 5) $rating = 0;
    if (mb_strlen($name) < 2) fail('Please enter your name.');
    $emailErr = tst_email_ok($email);
    if ($emailErr !== '') fail($emailErr);
    if (mb_strlen($text) < 20) fail('Please write a little more (at least 20 characters).');
    if (preg_match('#https?://|www\.#i', $text)) fail('Please remove links from your testimonial.');
    if (empty($b['consent'])) fail('Please agree to have your testimonial shown publicly.');
    rate_limit('testimonial', 3, 3600);
    tst_table();
    $db = pdo();
    $st = $db->prepare("SELECT COUNT(*) FROM testimonials WHERE email = ? AND created_at > (NOW() - INTERVAL 30 DAY)");
    $st->execute([$email]);
    if ((int)$st->fetchColumn() >= 2) fail('You have already shared testimonials recently. Thank you!', 429);

    $token = bin2hex(random_bytes(32));
    $db->prepare("INSERT INTO testimonials (name, email, city, rating, body, status, token_hash, token_expires, ip_hash)
                  VALUES (?,?,?,?,?,'unconfirmed',?,DATE_ADD(NOW(), INTERVAL 48 HOUR),?)")
       ->execute([$name, $email, $city !== '' ? $city : null, $rating > 0 ? $rating : null, $text, hash('sha256', $token), ip_hash()]);
    $id = (int)$db->lastInsertId();

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $link = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['SCRIPT_NAME'] ?? '/api/index.php') . '?action=testimonial_confirm&t=' . $token;
    $site = cfg('site_name', 'Website');
    $msg = "Hi $name,\n\nThank you for sharing your words about $site.\n"
         . "Please confirm your email address by opening this link (valid for 48 hours):\n\n$link\n\n"
         . "After you confirm, your testimonial is reviewed before it appears on the website. Your email address is never shown publicly.\n\n"
         . "If you did not write this, ignore this message and nothing will be published.\n";
    if (!tst_mail($email, "Confirm your testimonial for $site", $msg)) {
        $db->prepare("DELETE FROM testimonials WHERE id = ?")->execute([$id]);
        fail('We could not send the confirmation email. Please try again later or use the contact form.', 503);
    }
    out(['ok' => true, 'emailed' => true]);
}

/* Opened from the email. Verifies the one-time token, then sends the visitor back to the site. */
function act_testimonial_confirm() {
    $base = rtrim(cfg('site_url', 'https://chub.yeneflow.com'), '/') . '/testimonials.html';
    $go = function ($q) use ($base) { header('Cache-Control: no-store'); header('Location: ' . $base . '?' . $q); exit; };
    $t = (string)($_GET['t'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $t)) $go('confirm=invalid');
    tst_table();
    $db = pdo();
    $st = $db->prepare("SELECT id, name, email, rating, body, (token_expires < NOW()) AS expired FROM testimonials WHERE token_hash = ? AND status = 'unconfirmed'");
    $st->execute([hash('sha256', $t)]);
    $r = $st->fetch();
    if (!$r) $go('confirm=invalid');
    if ((int)$r['expired'] === 1) $go('confirm=expired');
    $db->prepare("UPDATE testimonials SET status = 'pending', verified_at = NOW(), token_hash = NULL, token_expires = NULL WHERE id = ?")->execute([$r['id']]);
    tst_mail(cfg('mail_to'), '[' . cfg('site_name', 'Website') . '] New testimonial to review',
        "A testimonial with a confirmed email is waiting for your approval:\n\nFrom: " . $r['name'] . ' <' . $r['email'] . ">\nRating: " . ($r['rating'] ? $r['rating'] . '/5' : 'n/a') . "\n\n" . $r['body'] . "\n\nApprove or hide it in your admin dashboard.\n");
    $go('confirmed=1');
}

function act_testimonials() {
    tst_table();
    $limit = max(1, min(30, (int)($_GET['limit'] ?? 30)));
    $db = pdo();
    $rows = $db->query("SELECT id, name, city, rating, body, COALESCE(verified_at, created_at) AS at FROM testimonials WHERE status = 'approved' ORDER BY id DESC LIMIT $limit")->fetchAll();
    $sum = $db->query("SELECT COUNT(*) AS n, COUNT(rating) AS rated, AVG(rating) AS avg_rating FROM testimonials WHERE status = 'approved'")->fetch();
    $items = [];
    foreach ($rows as $r) {
        $items[] = ['id' => (int)$r['id'], 'name' => tst_public_name($r['name']), 'city' => $r['city'],
                    'rating' => $r['rating'] !== null ? (int)$r['rating'] : null, 'body' => $r['body'], 'date' => iso($r['at'])];
    }
    out(['testimonials' => $items, 'count' => (int)$sum['n'], 'average' => ((int)$sum['rated'] > 0) ? round((float)$sum['avg_rating'], 1) : null]);
}

function adm_testimonials() {
    require_admin();
    tst_table();
    $status = $_GET['status'] ?? '';
    $sql = "SELECT id, name, email, city, rating, body, status, verified_at, created_at FROM testimonials";
    $args = [];
    if (in_array($status, ['unconfirmed', 'pending', 'approved', 'hidden'], true)) { $sql .= " WHERE status = ?"; $args[] = $status; }
    $st = pdo()->prepare($sql . " ORDER BY FIELD(status, 'pending', 'approved', 'hidden', 'unconfirmed'), id DESC LIMIT 300");
    $st->execute($args);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { $r['created_at'] = iso($r['created_at']); $r['verified_at'] = iso($r['verified_at']); }
    out(['testimonials' => $rows]);
}

function adm_testimonial_update() {
    require_admin();
    tst_table();
    $b = body(); $id = (int)($b['id'] ?? 0); $act = (string)($b['action'] ?? '');
    $db = pdo();
    $st = $db->prepare("SELECT id, status FROM testimonials WHERE id = ?");
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) fail('Testimonial not found.', 404);
    if ($act === 'approve') {
        if ($r['status'] === 'unconfirmed') fail('This email address has not been confirmed yet.');
        $db->prepare("UPDATE testimonials SET status = 'approved' WHERE id = ?")->execute([$id]);
    } elseif ($act === 'hide') {
        $db->prepare("UPDATE testimonials SET status = 'hidden' WHERE id = ?")->execute([$id]);
    } elseif ($act === 'delete') {
        $db->prepare("DELETE FROM testimonials WHERE id = ?")->execute([$id]);
    } else fail('Unknown action.');
    out(['ok' => true]);
}
