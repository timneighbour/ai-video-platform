ALTER TABLE `musicVideoJobs` ADD `vocalsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `vocalsKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `vocalsStatus` varchar(32) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `songBpm` int;