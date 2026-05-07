ALTER TABLE `musicVideoJobs` MODIFY COLUMN `sceneSetting` text;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `reRenderCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `freeReRenderUsed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lastReRenderAt` timestamp;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `cameraDirection` varchar(64);