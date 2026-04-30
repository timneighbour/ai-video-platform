ALTER TABLE `wizShortsJobs` ADD `characterId` int;--> statement-breakpoint
ALTER TABLE `wizShortsJobs` ADD `characterLockEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `wizShortsScenes` ADD `previewImageUrl` varchar(1024);