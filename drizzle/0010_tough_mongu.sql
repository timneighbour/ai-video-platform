ALTER TABLE `videoCharacters` ADD `lockedDescription` text;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `isLocked` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `lockedAt` timestamp;