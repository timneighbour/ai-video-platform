-- ============================================================
-- WIZ AI — Missing Tables Migration
-- Date: 2026-04-22
-- Tables: enhancementJobs, experiment_assignments
-- 
-- SAFETY: This migration is purely ADDITIVE.
-- It only creates new tables. No existing tables, columns,
-- indexes, or data are modified or dropped.
-- Existing users, credits, subscriptions, payments, and
-- music video jobs are completely unaffected.
-- 
-- ROLLBACK: To undo, simply run:
--   DROP TABLE IF EXISTS `enhancementJobs`;
--   DROP TABLE IF EXISTS `experiment_assignments`;
-- ============================================================

-- Table 1: enhancementJobs
-- Used by the WizSound enhancement feature (video + music + captions)
CREATE TABLE IF NOT EXISTS `enhancementJobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `inputVideoUrl` varchar(1024) NOT NULL,
  `inputVideoKey` varchar(512) NOT NULL,
  `inputVideoDuration` int NOT NULL,
  `inputVideoSize` int NOT NULL,
  `style` varchar(64) NOT NULL,
  `musicEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `captionsEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `analysisStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `analysisData` longtext,
  `speechSegments` longtext,
  `sceneSegments` longtext,
  `detectedMood` varchar(128),
  `musicGenerationStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `musicUrl` varchar(1024),
  `musicKey` varchar(512),
  `sunoTaskId` varchar(255),
  `captionSegments` longtext,
  `renderStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `outputUrl16x9` varchar(1024),
  `outputKey16x9` varchar(512),
  `outputUrl9x16` varchar(1024),
  `outputKey9x16` varchar(512),
  `creditCost` int NOT NULL DEFAULT 1,
  `errorMessage` text,
  `status` enum('draft','analyzing','generating','rendering','completed','failed') NOT NULL DEFAULT 'draft',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: experiment_assignments
-- Used for A/B testing variant assignment (no active routes reference this yet)
CREATE TABLE IF NOT EXISTS `experiment_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `anonId` varchar(64) DEFAULT NULL,
  `experimentId` varchar(64) NOT NULL,
  `variant` varchar(32) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_experiment_user` (`userId`, `experimentId`),
  KEY `idx_experiment_anon` (`anonId`, `experimentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
