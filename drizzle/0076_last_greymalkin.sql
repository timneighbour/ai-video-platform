CREATE TABLE `characterScenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`characterId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`positionOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterScenes_id` PRIMARY KEY(`id`)
);
