CREATE TABLE `sceneActionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`sceneId` int NOT NULL,
	`salAction` enum('retry','cancel') NOT NULL,
	`sceneIndex` int NOT NULL DEFAULT 0,
	`jobTitle` varchar(255),
	`errorMessageBefore` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sceneActionLogs_id` PRIMARY KEY(`id`)
);
