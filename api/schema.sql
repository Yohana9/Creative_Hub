CREATE TABLE IF NOT EXISTS items (
  item_key VARCHAR(191) NOT NULL,
  kind VARCHAR(12) NOT NULL DEFAULT 'audio',
  title VARCHAR(200) NOT NULL DEFAULT '',
  plays INT UNSIGNED NOT NULL DEFAULT 0,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  likes INT UNSIGNED NOT NULL DEFAULT 0,
  comments INT UNSIGNED NOT NULL DEFAULT 0,
  shares INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_event_at DATETIME NULL,
  PRIMARY KEY (item_key),
  KEY idx_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_key VARCHAR(191) NOT NULL,
  event_type VARCHAR(12) NOT NULL,
  vhash CHAR(64) NOT NULL,
  device VARCHAR(12) NULL,
  browser VARCHAR(20) NULL,
  country CHAR(2) NULL,
  referrer VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_time (item_key, created_at),
  KEY idx_time (created_at),
  KEY idx_dedup (vhash, item_key, event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS likes (
  item_key VARCHAR(191) NOT NULL,
  vhash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_key, vhash),
  KEY idx_v (vhash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_key VARCHAR(191) NOT NULL,
  parent_id INT UNSIGNED NULL,
  author VARCHAR(60) NOT NULL,
  body TEXT NOT NULL,
  is_owner TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('visible','pending','hidden') NOT NULL DEFAULT 'visible',
  ip_hash CHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item (item_key, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  country VARCHAR(80) NOT NULL,
  city VARCHAR(80) NOT NULL,
  address VARCHAR(255) NOT NULL,
  organization VARCHAR(120) NULL,
  subject VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  ip_hash CHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_read (is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bucket VARCHAR(40) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rl (bucket, ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Testimonials (also created automatically on first use)
CREATE TABLE IF NOT EXISTS testimonials (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL, email VARCHAR(160) NOT NULL, city VARCHAR(80) NULL, rating TINYINT UNSIGNED NULL, body TEXT NOT NULL,
  status ENUM('unconfirmed','pending','approved','hidden') NOT NULL DEFAULT 'unconfirmed',
  token_hash CHAR(64) NULL, token_expires DATETIME NULL, verified_at DATETIME NULL, ip_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status, id), KEY idx_email (email), KEY idx_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
