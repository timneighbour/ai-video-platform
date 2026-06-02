ALTER TABLE `musicVideoJobs` ADD `stemAnalysisStatus` varchar(32) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemAnalysisCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemVocalsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemDrumsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemBassUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemPianoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemGuitarUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemOtherUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `stemAccompanimentUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `envelopesUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `energyMapsUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `sectionsJson` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `subtitleTimingJson` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `validationJson` text;