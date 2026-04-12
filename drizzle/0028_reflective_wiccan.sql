ALTER TABLE `musicVideoJobs` ADD `enforceStrictMode` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `promptSnapshot` longtext;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `negativePromptSnapshot` longtext;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `strictCharacterCount` int DEFAULT 3;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedOutfit` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedProps` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedRole` text;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedRules` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `normalisedAt` timestamp;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `isRealPerson` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `characterMode` enum('photo','ai_generated') DEFAULT 'photo';