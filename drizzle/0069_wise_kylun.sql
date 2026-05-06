ALTER TABLE `musicVideoScenes` ADD `focusCharacter` varchar(128);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `camera` json;--> statement-breakpoint
ALTER TABLE `users` ADD `isFoundingCreator` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `foundingCreatorGrantedAt` timestamp;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `voiceProfile` longtext;