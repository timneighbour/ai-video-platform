ALTER TABLE `musicVideoScenes` ADD `sceneType` enum('cinematic','performance') DEFAULT 'cinematic' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `hedraVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `hedraVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `hedraGenerationId` varchar(255);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `hedraStatus` enum('pending','processing','done','error') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `heroImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `heroImageKey` varchar(512);