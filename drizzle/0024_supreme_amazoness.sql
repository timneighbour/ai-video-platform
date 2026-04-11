ALTER TABLE `videoCharacters` ADD `masterPortraitUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `masterSeed` int;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `characterPrompt` text;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `masterPortraitGeneratedAt` timestamp;