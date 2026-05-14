ALTER TABLE `musicVideoScenes` ADD `lipSyncVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipSyncVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipSyncTaskId` varchar(255);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `sceneLipSyncStatus` enum('pending','processing','done','error') DEFAULT 'pending' NOT NULL;