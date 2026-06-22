CREATE TABLE `creator_network_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creator_network_waitlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `creator_network_waitlist_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `imageGenSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`defaultQuality` enum('low','medium','high','auto') NOT NULL DEFAULT 'medium',
	`defaultSize` varchar(32) NOT NULL DEFAULT '1536x1024',
	`freeUserDailyLimit` int NOT NULL DEFAULT 3,
	`freeUserQuality` enum('low','medium','high','auto') NOT NULL DEFAULT 'low',
	`maxPromptLength` int NOT NULL DEFAULT 4000,
	`maxUploadSizeMb` int NOT NULL DEFAULT 20,
	`providerFallbackEnabled` boolean NOT NULL DEFAULT true,
	`creditCosts` text NOT NULL DEFAULT ('{"low":1,"medium":4,"high":12,"edit_low":5,"edit_medium":10,"edit_high":20}'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imageGenSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imageGenerationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(64) NOT NULL DEFAULT 'openai',
	`model` varchar(64) NOT NULL DEFAULT 'gpt-image-2',
	`mode` enum('generate','edit') NOT NULL DEFAULT 'generate',
	`prompt` text NOT NULL,
	`promptLength` int NOT NULL DEFAULT 0,
	`stylePreset` varchar(64),
	`size` varchar(32) NOT NULL DEFAULT '1536x1024',
	`quality` enum('low','medium','high','auto') NOT NULL DEFAULT 'medium',
	`creditsCharged` int NOT NULL DEFAULT 0,
	`creditsRefunded` int NOT NULL DEFAULT 0,
	`requestId` varchar(255),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`errorCode` varchar(64),
	`errorMessage` text,
	`imageUrl` varchar(1024),
	`storagePath` varchar(512),
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `imageGenerationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venueImageCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryKey` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`imageTitle` varchar(500),
	`imageSource` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `venueImageCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `venueImageCache_queryKey_unique` UNIQUE(`queryKey`)
);
--> statement-breakpoint
DROP TABLE `pay_per_video_orders`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `venueLockedKey` varchar(64);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `venueLockedDisplayName` varchar(255);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `venueLockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `venueCustomDNA` text;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `provider` varchar(64) DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `model` varchar(64) DEFAULT 'gpt-image-2' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `mode` enum('generate','edit') DEFAULT 'generate' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `quality` enum('low','medium','high','auto') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `size` varchar(32) DEFAULT '1024x1024' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `creditsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `status` enum('pending','completed','failed') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `errorMessage` text;--> statement-breakpoint
ALTER TABLE `wizImages` ADD `logId` int;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` DROP COLUMN `vocalsSubmittedAt`;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` DROP COLUMN `assemblyAttempts`;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` DROP COLUMN `lipSyncAttempts`;