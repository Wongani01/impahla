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
  `role`          ENUM('user','admin')   NOT NULL DEFAULT 'user',
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

CREATE TABLE IF NOT EXISTS `contributions` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    VARCHAR(36)  NOT NULL,
  `name`       VARCHAR(120) NOT NULL,
  `amount`     INT          NOT NULL DEFAULT 0,
  `gift`       VARCHAR(255) NOT NULL DEFAULT '',
  `status`     ENUM('promised','received') NOT NULL DEFAULT 'received',
  `note`       TEXT         NOT NULL,
  `date`       VARCHAR(10)  NOT NULL,
  `photo`      MEDIUMTEXT   NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contributions_user` (`user_id`),
  CONSTRAINT `fk_contributions_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
