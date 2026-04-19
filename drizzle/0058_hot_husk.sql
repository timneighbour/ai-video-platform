CREATE TABLE `providerJobLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneId` int NOT NULL,
	`provider` varchar(64) NOT NULL,
	`providerJobId` varchar(512),
	`idempotencyKey` varchar(256) NOT NULL,
	`pjlStatus` enum('submitted','completed','failed','cancelled') NOT NULL DEFAULT 'submitted',
	`attemptNumber` int NOT NULL DEFAULT 1,
	`estimatedCostUsd` decimal(10,4) DEFAULT '0.0000',
	`actualCostUsd` decimal(10,4),
	`submissionReason` varchar(255),
	`errorMessage` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`failedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `providerJobLogs_id` PRIMARY KEY(`id`)
);
