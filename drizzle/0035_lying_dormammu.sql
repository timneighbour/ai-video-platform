ALTER TABLE `kidsVideoJobs` ADD `characterLockData` longtext;--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `audioUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `audioKey` varchar(512);--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `audioMimeType` varchar(64);