CREATE TABLE `savedStoryboards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`brief` text NOT NULL,
	`lyrics` text,
	`animStyle` varchar(100),
	`sceneCount` int NOT NULL DEFAULT 8,
	`scenes` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `savedStoryboards_id` PRIMARY KEY(`id`)
);
