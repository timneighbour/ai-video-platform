ALTER TABLE `musicVideoJobs` MODIFY COLUMN `transcription` text DEFAULT (null);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterImageUrl` varchar(1024) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterImageKey` varchar(512) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `kidsTargetAge` varchar(32) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `kidsEducationalTheme` varchar(128) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `lyrics` longtext DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `finalVideoUrl` varchar(1024) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `finalVideoKey` varchar(512) DEFAULT null;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterRoster` text DEFAULT (null);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `errorMessage` text DEFAULT (null);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `status` enum('draft','storyboard_ready','rendering','assembling','completed','failed') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` DROP COLUMN `mvJobStatus`;