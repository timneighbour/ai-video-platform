CREATE TABLE `wizScoreJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoKey` varchar(512) NOT NULL,
	`videoUrl` varchar(1024) NOT NULL,
	`videoDuration` int,
	`analysis` text,
	`sunoPrompt` text,
	`sunoTaskId` int,
	`audioUrl` varchar(1024),
	`wizScoreStatus` enum('pending','analyzing','generating','trimming','complete','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizScoreJobs_id` PRIMARY KEY(`id`)
);
