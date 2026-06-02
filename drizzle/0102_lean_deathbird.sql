ALTER TABLE `videoCharacters` ADD `performanceRefUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `mediumShotRefUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `cinematicRefUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `environmentRefUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `environmentRefStyle` varchar(255);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `autoPrepStatus` enum('pending','stage1_processing','stage1_done','stage2_processing','complete','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `autoPrepStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `autoPrepCompletedAt` timestamp;