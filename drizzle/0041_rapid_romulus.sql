ALTER TABLE `kidsVideoJobs` ADD `renderStage` varchar(64);--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `renderProgress` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `renderMessage` varchar(255);