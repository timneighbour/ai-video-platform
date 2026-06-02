CREATE TABLE `continuityResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneAId` int NOT NULL,
	`sceneBId` int NOT NULL,
	`performerScore` decimal(4,3),
	`wardrobeScore` decimal(4,3),
	`environmentScore` decimal(4,3),
	`lightingScore` decimal(4,3),
	`cameraEnergyScore` decimal(4,3),
	`overallScore` decimal(4,3),
	`passed` boolean NOT NULL DEFAULT false,
	`failureCategories` text,
	`performerEmbeddingJson` text,
	`identityVariance` decimal(5,4),
	`identityLockStrength` decimal(4,3),
	`assessmentNotes` text,
	`action` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `continuityResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editIntelligenceResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`detectedBpm` decimal(6,2),
	`beatGridJson` text,
	`emotionalArcJson` text,
	`cameraEnergyProfileJson` text,
	`motifPlanJson` text,
	`transitionPlanJson` text,
	`sequencingAdjustmentsJson` text,
	`editQualityScore` decimal(4,3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editIntelligenceResults_id` PRIMARY KEY(`id`),
	CONSTRAINT `editIntelligenceResults_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `sceneRelationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneId` int NOT NULL,
	`prevSceneId` int,
	`nextSceneId` int,
	`chorusGroup` int,
	`verseGroup` int,
	`bridgeGroup` int,
	`motifGroup` varchar(64),
	`sectionType` varchar(32),
	`positionInSection` int,
	`inheritCostumeFromPrev` boolean NOT NULL DEFAULT true,
	`inheritLightingFromPrev` boolean NOT NULL DEFAULT true,
	`inheritEnvironmentFromPrev` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sceneRelationships_id` PRIMARY KEY(`id`),
	CONSTRAINT `sceneRelationships_sceneId_unique` UNIQUE(`sceneId`)
);
--> statement-breakpoint
CREATE TABLE `sceneVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`jobId` int NOT NULL,
	`versionNumber` int NOT NULL DEFAULT 1,
	`promptSnapshot` text,
	`directorModeSnapshot` varchar(64),
	`cameraAngle` varchar(32),
	`rerenderType` varchar(32),
	`identityPreserved` boolean NOT NULL DEFAULT false,
	`rawVideoUrl` varchar(1024),
	`lipSyncVideoUrl` varchar(1024),
	`thumbnailUrl` varchar(1024),
	`status` enum('rendering','ready','accepted','rejected','alternate') NOT NULL DEFAULT 'rendering',
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`continuityScore` decimal(4,3),
	`lipSyncGrade` varchar(8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sceneVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `status` enum('draft','storyboard_ready','rendering','assembling','completed','failed','paused','cancelled','provider_unavailable') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `musicVideoScenes` MODIFY COLUMN `mvSceneStatus` enum('pending','generating','completed','failed','failed_retryable') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `providerErrorCode` varchar(64);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `providerErrorAt` timestamp;