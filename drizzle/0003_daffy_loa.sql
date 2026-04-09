ALTER TABLE `musicVideoJobs` ADD `transcription` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `transcriptionStatus` varchar(32) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lyrics` text;