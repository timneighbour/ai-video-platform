CREATE TABLE `creditDisputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int,
	`jobType` varchar(32),
	`creditsCharged` int NOT NULL,
	`creditsRequested` int,
	`reason` text NOT NULL,
	`status` enum('pending','approved','partial','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`creditsRefunded` int NOT NULL DEFAULT 0,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditDisputes_id` PRIMARY KEY(`id`)
);
