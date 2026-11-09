-- Impahla app Party Registry — database schema
-- Import this file with phpMyAdmin (XAMPP) or: mysql -u root < db/schema.sql

CREATE DATABASE IF NOT EXISTS `mphatso`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mphatso`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(36)  NOT NULL,
  `name`          VARCHAR(120) NOT NULL,
  `email`         VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('user','planner','admin')   NOT NULL DEFAULT 'user',
  `status`        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         VARCHAR(64) NOT NULL,
  `user_id`    VARCHAR(36) NOT NULL,
  `expires_at` TIMESTAMP   NOT NULL,
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Events: every celebration belongs to a planner and drives contributions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
  `id`                 VARCHAR(36)  NOT NULL,
  `planner_id`         VARCHAR(36)  NOT NULL,
  `event_name`         VARCHAR(160) NOT NULL,
  `description`        TEXT         NOT NULL,
  `category`           ENUM('kitchen_party','bridal_shower','other') NOT NULL DEFAULT 'kitchen_party',
  `host_name`          VARCHAR(120) NOT NULL,
  `event_date`         DATE         NOT NULL,
  `event_time`         VARCHAR(8)   NOT NULL,
  `venue`              VARCHAR(160) NOT NULL,
  `location`           VARCHAR(255) NOT NULL,
  `contact_info`       VARCHAR(120) NOT NULL,
  `expected_attendees` INT          NOT NULL DEFAULT 0,
  `cover_image`        MEDIUMTEXT   NULL,
  `status`             ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  `created_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_planner` (`planner_id`),
  KEY `idx_events_status`  (`status`),
  CONSTRAINT `fk_events_planner` FOREIGN KEY (`planner_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Contributions (v2). Instead of dropping any existing table, this migrates it:
-- renames the old table to `contributions_legacy`, creates the new table, copies
-- the convertible rows, then reports anything that could not be migrated.
--   amount -> cash_amount, gift -> gift_description,
--   promised -> pledged, received -> confirmed.
-- Rows whose event_id does not reference a real event stay in
-- `contributions_legacy` (never deleted) and are listed by the report below.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `mphatso_migrate_contributions`;
DELIMITER $$
CREATE PROCEDURE `mphatso_migrate_contributions`()
BEGIN
  DECLARE v_tbl INT DEFAULT 0;
  DECLARE v_legacy INT DEFAULT 0;
  DECLARE v_has_event_id INT DEFAULT 0;

  SELECT COUNT(*) INTO v_tbl
    FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contributions';

  IF v_tbl > 0 THEN
    SELECT COUNT(*) INTO v_legacy
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contributions' AND COLUMN_NAME = 'amount';
  END IF;

  IF v_legacy > 0 THEN
    SELECT COUNT(*) INTO v_has_event_id
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contributions' AND COLUMN_NAME = 'event_id';

    RENAME TABLE `contributions` TO `contributions_legacy`;
  END IF;

  CREATE TABLE IF NOT EXISTS `contributions` (
    `id`                  VARCHAR(36)  NOT NULL,
    `event_id`            VARCHAR(36)  NOT NULL,
    `contributor_id`      VARCHAR(36)  NULL,
    `contributor_name`    VARCHAR(120) NOT NULL,
    `phone_number`        VARCHAR(30)  NOT NULL,
    `contribution_type`   ENUM('cash','gift') NOT NULL,
    `cash_amount`         INT          NOT NULL DEFAULT 0,
    `gift_description`    VARCHAR(255) NOT NULL DEFAULT '',
    `gift_value`          INT          NULL,
    `quantity`            INT          NOT NULL DEFAULT 1,
    `gift_image`          MEDIUMTEXT   NULL,
    `note`                TEXT         NOT NULL,
    `contribution_status` ENUM('pledged','paid','pending_verification','confirmed','delivered','received','cancelled') NOT NULL DEFAULT 'pledged',
    `date`                VARCHAR(10)  NOT NULL,
    `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_contributions_event` (`event_id`),
    KEY `idx_contributions_status` (`contribution_status`),
    CONSTRAINT `fk_contributions_event` FOREIGN KEY (`event_id`)
      REFERENCES `events` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_contributions_contributor` FOREIGN KEY (`contributor_id`)
      REFERENCES `users` (`id`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  IF v_legacy > 0 AND v_has_event_id > 0 THEN
    INSERT INTO `contributions`
      (`id`,`event_id`,`contributor_id`,`contributor_name`,`phone_number`,`contribution_type`,
       `cash_amount`,`gift_description`,`gift_value`,`quantity`,`gift_image`,`note`,
       `contribution_status`,`date`)
    SELECT l.`id`, l.`event_id`, l.`user_id`, l.`name`, l.`phone_number`, l.`contribution_type`,
           l.`amount`, l.`gift`, l.`gift_value`, l.`quantity`, l.`photo`, l.`note`,
           CASE l.`status`
             WHEN 'promised' THEN 'pledged'
             WHEN 'received' THEN 'confirmed'
             ELSE l.`status`
           END,
           l.`date`
      FROM `contributions_legacy` l
      JOIN `events` e ON e.`id` = l.`event_id`;
  END IF;

  IF v_legacy > 0 THEN
    SELECT 'migrated' AS `report`, COUNT(*) AS `rows_count` FROM `contributions`
    UNION ALL
    SELECT 'unmigrated (kept in contributions_legacy)', COUNT(*)
      FROM `contributions_legacy` l
      LEFT JOIN `events` e ON e.`id` = l.`event_id`
     WHERE e.`id` IS NULL;
  ELSE
    SELECT 'no legacy contributions table found - new table created' AS `report`, 0 AS `rows_count`;
  END IF;
END$$
DELIMITER ;

CALL `mphatso_migrate_contributions`();
DROP PROCEDURE `mphatso_migrate_contributions`;

CREATE TABLE IF NOT EXISTS `site_content` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `slug`       VARCHAR(60)  NOT NULL,
  `title`      VARCHAR(160) NOT NULL,
  `body`       TEXT         NOT NULL,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_site_content_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `site_content` (`slug`, `title`, `body`) VALUES
  ('hero_title', 'A little joy, well kept.',
   'Impahla app is a private contribution registry for kitchen parties and bridal showers. Track every promise, every gift and every generous heart in one calm place.'),
  ('hero_eyebrow', 'KITCHEN PARTY REGISTRY', 'Made warmer by all of you.'),
  ('about', 'About Impahla app',
   'Impahla app was built for hosts in Zambia who want a simple, dignified way to keep track of contributions to a celebration. Organisers record each contribution, admins keep the whole registry tidy, and nothing is ever shared publicly.')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `body` = VALUES(`body`);
