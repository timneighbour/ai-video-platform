ALTER TABLE `musicVideoJobs` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `shareSlug` varchar(64);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `thumbnailUrl` varchar(1024);