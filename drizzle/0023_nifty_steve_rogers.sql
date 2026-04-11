ALTER TABLE `musicVideoJobs` ADD `characterLockEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `faceValidationStatus` enum('pending','matched','warning','regenerated','skipped') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `faceValidationScores` text;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `faceValidationAttempts` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `faceEmbedding` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `referencePhotoBase64` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedSeed` int;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `faceValidationThreshold` int DEFAULT 75;