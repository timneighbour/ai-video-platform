ALTER TABLE `kidsVideoJobs` ADD `kidsVocalsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `kidsVocalsKey` varchar(512);--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `kidsEnableLipSync` boolean DEFAULT false NOT NULL;