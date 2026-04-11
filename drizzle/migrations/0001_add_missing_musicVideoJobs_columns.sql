-- Add missing columns to musicVideoJobs table for kids video mode and captions
ALTER TABLE `musicVideoJobs` 
ADD COLUMN `isKidsVideo` boolean NOT NULL DEFAULT false,
ADD COLUMN `kidsTargetAge` varchar(32),
ADD COLUMN `kidsEducationalTheme` varchar(128),
ADD COLUMN `kidsEnableSingalong` boolean NOT NULL DEFAULT true,
ADD COLUMN `kidsFriendlyIntensity` ENUM('soft', 'moderate', 'vibrant') NOT NULL DEFAULT 'vibrant',
ADD COLUMN `lyrics` longtext,
ADD COLUMN `lyricsStatus` varchar(32) DEFAULT 'pending',
ADD COLUMN `captionsEnabled` boolean NOT NULL DEFAULT true,
ADD COLUMN `captionStyle` varchar(32) DEFAULT 'bottom',
ADD COLUMN `captionBackground` varchar(32) DEFAULT 'soft_shadow',
ADD COLUMN `captionFontSize` int NOT NULL DEFAULT 24,
ADD COLUMN `captionFontStyle` varchar(32) DEFAULT 'sans-serif',
ADD COLUMN `captionTextColour` varchar(7) DEFAULT '#FFFFFF',
ADD COLUMN `captionHighlightColour` varchar(7) DEFAULT '#FFD700',
ADD COLUMN `captionKaraokeMode` boolean NOT NULL DEFAULT false,
ADD COLUMN `captionSafeArea` varchar(32) DEFAULT 'bottom_center',
ADD COLUMN `lyricsApproved` boolean NOT NULL DEFAULT false;
