ALTER TABLE `musicVideoJobs` ADD `characterImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `characterImageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `enableLipSync` boolean DEFAULT false;