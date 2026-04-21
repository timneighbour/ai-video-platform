CREATE TABLE `experiment_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`anonId` varchar(64),
	`experimentId` varchar(64) NOT NULL,
	`variant` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `experiment_assignments_id` PRIMARY KEY(`id`)
);
