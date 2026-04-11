ALTER TABLE `musicVideoJobs` ADD `isKidsVideo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `kidsTargetAge` varchar(32);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `kidsEducationalTheme` varchar(128);--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `kidsEnableSingalong` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `kidsFriendlyIntensity` enum('soft','moderate','vibrant') DEFAULT 'vibrant' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `lyrics` longtext;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `lyricsStatus` varchar(32) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionStyle` varchar(32) DEFAULT 'bottom';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionBackground` varchar(32) DEFAULT 'soft_shadow';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionFontSize` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionFontStyle` varchar(32) DEFAULT 'sans-serif';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionTextColour` varchar(7) DEFAULT '#FFFFFF';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionHighlightColour` varchar(7) DEFAULT '#FFD700';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionKaraokeMode` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `captionSafeArea` varchar(32) DEFAULT 'bottom_center';--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `lyricsApproved` boolean DEFAULT false NOT NULL;