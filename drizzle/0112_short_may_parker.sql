ALTER TABLE `musicVideoJobs` ADD `upsellCinematicScenes` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellUpgrade4K` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellRemoveWatermark` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellStatus` enum('none','pending','processing','completed','failed') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `upsellProcessedAt` timestamp;