CREATE TABLE `renderAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`attemptNumber` int NOT NULL DEFAULT 1,
	`finalVideoUrl` varchar(1024),
	`finalVideoKey` varchar(512),
	`sha256` varchar(64),
	`fileSizeBytes` bigint,
	`durationSeconds` decimal(8,3),
	`sceneCount` int NOT NULL DEFAULT 0,
	`renderValidationStatus` enum('pending','passed','failed','skipped') NOT NULL DEFAULT 'pending',
	`validationError` text,
	`validationErrorCode` varchar(64),
	`assembledAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `renderAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validationRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`validationRunStatus` enum('running','passed','failed','timeout') NOT NULL DEFAULT 'running',
	`jobId` int,
	`finalVideoUrl` varchar(1024),
	`sha256` varchar(64),
	`durationSeconds` decimal(8,3),
	`expectedDurationSeconds` decimal(8,3),
	`sceneCount` int DEFAULT 0,
	`expectedSceneCount` int DEFAULT 0,
	`errorMessage` text,
	`durationMs` int,
	CONSTRAINT `validationRuns_id` PRIMARY KEY(`id`)
);
