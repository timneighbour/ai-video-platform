ALTER TABLE `kidsVideoJobs` ADD `kidsPreviewStatus` enum('none','generating','ready','failed') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `kidsVideoJobs` ADD `previewVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `mvPreviewStatus` enum('none','generating','ready','failed') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `previewVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `renderJobs` ADD `rjPreviewStatus` enum('none','generating','ready','failed') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `renderJobs` ADD `previewVideoUrl` varchar(1024);