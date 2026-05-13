ALTER TABLE `musicVideoJobs` ADD `atlasFailureCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `fallbackProvider` varchar(32);