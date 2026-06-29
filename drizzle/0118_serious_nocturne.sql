CREATE TABLE `song_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int NOT NULL,
	`trackIndex` int NOT NULL DEFAULT 0,
	`creditsCharged` int NOT NULL DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `song_downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `songPreviewsUsed` int DEFAULT 0 NOT NULL;