ALTER TABLE `videoCharacters` ADD `characterConstraints` longtext;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `characterDefaultState` text;--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `rolePriority` enum('primary','secondary') DEFAULT 'primary';