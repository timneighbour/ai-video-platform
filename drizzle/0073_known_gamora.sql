CREATE TABLE `savedCharacters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`gender` enum('male','female','neutral') NOT NULL DEFAULT 'neutral',
	`animStyle` varchar(64),
	`photoUrl` text,
	`previewUrl` text,
	`tags` varchar(500),
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedCharacters_id` PRIMARY KEY(`id`)
);
