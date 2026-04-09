CREATE TABLE `musicVideoJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`audioUrl` varchar(1024) NOT NULL,
	`audioKey` varchar(512) NOT NULL,
	`audioDuration` int NOT NULL,
	`themePrompt` text NOT NULL,
	`genre` varchar(128),
	`mood` varchar(128),
	`mvJobStatus` enum('draft','storyboard_ready','rendering','assembling','completed','failed') NOT NULL DEFAULT 'draft',
	`totalScenes` int NOT NULL DEFAULT 0,
	`completedScenes` int NOT NULL DEFAULT 0,
	`finalVideoUrl` varchar(1024),
	`finalVideoKey` varchar(512),
	`creditCost` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicVideoJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicVideoScenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneIndex` int NOT NULL,
	`startTime` int NOT NULL,
	`duration` int NOT NULL,
	`prompt` text NOT NULL,
	`visualStyle` varchar(255),
	`mvSceneStatus` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`taskId` varchar(255),
	`videoUrl` varchar(1024),
	`videoKey` varchar(512),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicVideoScenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creditTransactions` MODIFY COLUMN `type` enum('subscription_grant','purchase','usage','refund','deduction') NOT NULL;--> statement-breakpoint
ALTER TABLE `creditTransactions` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `description` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `taskId` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `apiProvider` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `creditCost` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `creditsUsed`;