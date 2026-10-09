<?php
/* Yohan Records API. One entry point: index.php?action=NAME */
require __DIR__ . '/lib.php';
send_cors();

$action = $_GET['action'] ?? '';
$map = [
    'ping' => 'act_ping', 'stats' => 'act_stats', 'top' => 'act_top', 'track' => 'act_track', 'react' => 'act_react',
    'comments' => 'act_comments', 'comment' => 'act_comment', 'contact' => 'act_contact',
    'trending' => 'act_trending', 'admin_trending' => 'adm_trending', 'admin_trending_set' => 'adm_trending_set',
    'testimonials' => 'act_testimonials', 'testimonial' => 'act_testimonial',
    'admin_testimonials' => 'adm_testimonials', 'admin_testimonial_update' => 'adm_testimonial_update',
    'admin_check' => 'adm_check', 'admin_overview' => 'adm_overview', 'admin_items' => 'adm_items', 'admin_item_delete' => 'adm_item_delete',
    'admin_comments' => 'adm_comments', 'admin_comment_update' => 'adm_comment_update',
    'admin_contacts' => 'adm_contacts', 'admin_contact_update' => 'adm_contact_update', 'admin_export' => 'adm_export',
];
if (!isset($map[$action])) fail('Unknown action.', 404);
call_user_func($map[$action]);

/* ------------------------------------------------------------------ public */

function act_ping() { out(['ok' => true, 'time' => date('c'), 'build' => '2026-10-trending-2', 'features' => ['admin_check', 'testimonials', 'trending']]); }

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
    if ($t > 0 && (microtime(true) * 1000 - $t) < 2500) fail('That was quick. Please try again.', 429);
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

/* ------------------------------------------------------------ trending (Home "Top 10")
   Pinned songs (set in the dashboard) come first, in the order you chose. The remaining places are filled
   automatically: score = 2 x plays in the last 7 days + plays in the last 30 days, ties go to the most
   recently played song, then to all-time plays. */

function ensure_trending() {
    static $done = false; if ($done) return; $done = true;
    pdo()->exec("CREATE TABLE IF NOT EXISTS trending_pins (
      item_key VARCHAR(191) NOT NULL,
      pos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (item_key),
      KEY idx_pos (pos)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function trending_auto($limit = 60) {
    $sql = "SELECT i.item_key, i.title, i.plays, i.last_event_at,
                   COALESCE(SUM(e.created_at >= (NOW() - INTERVAL 7 DAY)), 0) AS p7,
                   COUNT(e.id) AS p30,
                   (2 * COALESCE(SUM(e.created_at >= (NOW() - INTERVAL 7 DAY)), 0) + COUNT(e.id)) AS score
            FROM items i
            LEFT JOIN events e ON e.item_key = i.item_key AND e.event_type = 'play' AND e.created_at >= (NOW() - INTERVAL 30 DAY)
            WHERE i.kind = 'audio' AND i.plays > 0
            GROUP BY i.item_key, i.title, i.plays, i.last_event_at
            ORDER BY score DESC, i.last_event_at DESC, i.plays DESC
            LIMIT " . (int)$limit;
    $rows = pdo()->query($sql)->fetchAll();
    foreach ($rows as &$r) { $r['plays'] = (int)$r['plays']; $r['p7'] = (int)$r['p7']; $r['p30'] = (int)$r['p30']; $r['score'] = (int)$r['score']; }
    return $rows;
}

function trending_pins() {
    return pdo()->query("SELECT item_key FROM trending_pins ORDER BY pos ASC, item_key ASC LIMIT 10")->fetchAll(PDO::FETCH_COLUMN);
}

function act_trending() {
    ensure_trending();
    $pins = trending_pins(); $auto = trending_auto(60);
    $byKey = []; foreach ($auto as $r) $byKey[$r['item_key']] = $r;
    $items = []; $seen = [];
    if ($pins) {
        $in = implode(',', array_fill(0, count($pins), '?'));
        $st = pdo()->prepare("SELECT item_key, title, plays FROM items WHERE item_key IN ($in)"); $st->execute($pins);
        $meta = []; foreach ($st as $r) $meta[$r['item_key']] = $r;
        foreach ($pins as $k) {
            $items[] = ['key' => $k, 'title' => $meta[$k]['title'] ?? '', 'plays' => (int)($meta[$k]['plays'] ?? 0), 'pinned' => true];
            $seen[$k] = true;
        }
    }
    foreach ($auto as $r) {
        if (count($items) >= 10) break;
        if (isset($seen[$r['item_key']])) continue;
        $items[] = ['key' => $r['item_key'], 'title' => $r['title'], 'plays' => $r['plays'], 'pinned' => false];
    }
    out(['items' => array_slice($items, 0, 10), 'pinned' => count($pins)]);
}

function adm_trending() {
    require_admin(); ensure_trending();
    $auto = trending_auto(10);
    foreach ($auto as &$r) $r['last_event_at'] = iso($r['last_event_at']);
    out(['pins' => trending_pins(), 'auto' => $auto]);
}

function adm_trending_set() {
    require_admin(); ensure_trending();
    $b = body(); $keys = $b['keys'] ?? null;
    if (!is_array($keys)) fail('Send a list of songs.');
    $clean = [];
    foreach ($keys as $k) {
        $k = (string)$k;
        if (!valid_key($k) || strpos($k, 'assets/audio/') !== 0) fail('Only songs can be pinned.');
        if (!in_array($k, $clean, true)) $clean[] = $k;
    }
    if (count($clean) > 10) fail('You can pin up to 10 songs.');
    $db = pdo(); $db->beginTransaction();
    try {
        $db->exec("DELETE FROM trending_pins");
        $ins = $db->prepare("INSERT INTO trending_pins (item_key, pos) VALUES (?, ?)");
        foreach ($clean as $i => $k) $ins->execute([$k, $i]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); fail('Could not save the list.', 500); }
    out(['ok' => true, 'pins' => $clean]);
}

/* ------------------------------------------------------------ testimonials */

/* Creates the table on first use, so nothing has to be re-imported. */
function ensure_testimonials() {
    static $done = false; if ($done) return; $done = true;
    pdo()->exec("CREATE TABLE IF NOT EXISTS testimonials (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      role VARCHAR(120) NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
      status VARCHAR(10) NOT NULL DEFAULT 'pending',
      ip_hash CHAR(64) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_status (status, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function act_testimonials() {
    ensure_testimonials();
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
    $st = pdo()->prepare("SELECT id, name, role, message, rating, created_at FROM testimonials WHERE status = 'visible' ORDER BY id DESC LIMIT $limit");
    $st->execute();
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['rating'] = (int)$r['rating']; $r['created_at'] = iso($r['created_at']); }
    $total = (int)pdo()->query("SELECT COUNT(*) FROM testimonials WHERE status = 'visible'")->fetchColumn();
    out(['testimonials' => $rows, 'total' => $total]);
}

function act_testimonial() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only.', 405);
    ensure_testimonials();
    $b = body();
    if (!empty($b['website'])) out(['ok' => true, 'pending' => true]);               // honeypot: pretend success
    $t = (int)($b['t'] ?? 0);
    if ($t > 0 && (microtime(true) * 1000 - $t) < 3000) fail('That was quick. Please review your message and send again.', 429);
    $name = str_replace(["\r", "\n"], ' ', clean_text($b['name'] ?? '', 80));
    $role = str_replace(["\r", "\n"], ' ', clean_text($b['role'] ?? '', 120));
    $text = clean_text($b['message'] ?? '', 800);
    $rating = max(1, min(5, (int)($b['rating'] ?? 5)));
    if (mb_strlen($name) < 2) fail('Please enter your name.');
    if (mb_strlen($text) < 10) fail('Please write a little more (at least 10 characters).');
    if (preg_match_all('#https?://|www\.#i', $text) > 1) fail('Please keep at most one link in your message.');
    rate_limit('testimonial', 3, 3600);
    $db = pdo(); $ih = ip_hash();
    $st = $db->prepare("SELECT 1 FROM testimonials WHERE ip_hash = ? AND message = ? LIMIT 1");
    $st->execute([$ih, $text]);
    if ($st->fetchColumn()) fail('You already sent that testimonial. Thank you!', 409);
    $pending = (bool)cfg('testimonials_need_approval', true);                         // new ones wait for your approval
    $db->prepare("INSERT INTO testimonials (name, role, message, rating, status, ip_hash) VALUES (?,?,?,?,?,?)")
       ->execute([$name, $role, $text, $rating, $pending ? 'pending' : 'visible', $ih]);
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
    if ($t > 0 && (microtime(true) * 1000 - $t) < 3000) fail('That was quick. Please review the form and send again.', 429);
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

/* Fast key check used by the login screen (no heavy queries). */
function adm_check() {
    require_admin();
    out(['ok' => true]);
}

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

function adm_testimonials() {
    require_admin(); ensure_testimonials();
    $st = pdo()->query("SELECT id, name, role, message, rating, status, created_at FROM testimonials ORDER BY (status = 'pending') DESC, id DESC LIMIT 300");
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['rating'] = (int)$r['rating']; $r['created_at'] = iso($r['created_at']); }
    out(['testimonials' => $rows]);
}

function adm_testimonial_update() {
    require_admin(); ensure_testimonials();
    $b = body(); $id = (int)($b['id'] ?? 0); $act = (string)($b['action'] ?? '');
    $db = pdo();
    $st = $db->prepare("SELECT id FROM testimonials WHERE id = ?"); $st->execute([$id]);
    if (!$st->fetchColumn()) fail('Testimonial not found.', 404);
    if ($act === 'approve' || $act === 'show') $db->prepare("UPDATE testimonials SET status = 'visible' WHERE id = ?")->execute([$id]);
    elseif ($act === 'hide') $db->prepare("UPDATE testimonials SET status = 'hidden' WHERE id = ?")->execute([$id]);
    elseif ($act === 'delete') $db->prepare("DELETE FROM testimonials WHERE id = ?")->execute([$id]);
    else fail('Unknown action.');
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
    foreach ($rows as $r) fputcsv($o, $r);
    fclose($o);
    exit;
}