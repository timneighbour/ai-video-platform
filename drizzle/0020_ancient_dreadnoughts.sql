ALTER TABLE `musicVideoJobs` MODIFY COLUMN `transcription` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterImageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `kidsTargetAge` varchar(32);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `kidsEducationalTheme` varchar(128);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `lyrics` longtext;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `finalVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `finalVideoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `characterRoster` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` MODIFY COLUMN `errorMessage` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `transcriptionSegments` longtext;