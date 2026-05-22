ALTER TABLE `musicVideoScenes` ADD `compositeStatus` enum('pending','processing','done','error','skipped') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `compositeVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `compositeVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `compositeAttempts` int DEFAULT 0 NOT NULL;