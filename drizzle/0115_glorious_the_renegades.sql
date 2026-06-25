ALTER TABLE `musicVideoScenes` ADD `grokVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `grokVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `grokVideoRequestId` varchar(255);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `grokVideoStatus` enum('pending','processing','done','error') DEFAULT 'pending' NOT NULL;