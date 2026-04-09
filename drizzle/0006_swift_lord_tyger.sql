CREATE TABLE `videoCharacterPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` varchar(1024) NOT NULL,
	`photoKey` varchar(512) NOT NULL,
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoCharacterPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoCharacters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'Character',
	`role` varchar(255),
	`enableLipSync` boolean DEFAULT false,
	`slotIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoCharacters_id` PRIMARY KEY(`id`)
);
