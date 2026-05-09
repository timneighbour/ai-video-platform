CREATE TABLE `providerHealth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`consecutiveFailures` int NOT NULL DEFAULT 0,
	`totalSpendUsd` decimal(10,4) NOT NULL DEFAULT '0',
	`wastedSpendUsd` decimal(10,4) NOT NULL DEFAULT '0',
	`avgRenderTimeMs` int NOT NULL DEFAULT 0,
	`isHealthy` boolean NOT NULL DEFAULT true,
	`providerMode` enum('full','probe-only','disabled') NOT NULL DEFAULT 'full',
	`lastFailureAt` timestamp,
	`lastSuccessAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerHealth_id` PRIMARY KEY(`id`),
	CONSTRAINT `providerHealth_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `providerSpendEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneId` int,
	`provider` varchar(64) NOT NULL,
	`costUsd` decimal(8,4) NOT NULL DEFAULT '0',
	`spendEventStatus` enum('success','failure','timeout','probe_success','probe_failure') NOT NULL,
	`renderTimeMs` int,
	`isProbe` boolean NOT NULL DEFAULT false,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `providerSpendEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `providerSpendUsd` decimal(8,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `wastedSpendUsd` decimal(8,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `maxSpendLimitUsd` decimal(6,2) DEFAULT '5.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `probePassed` boolean;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `finalVideoProduced` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `providerSpendUsd` decimal(6,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `providerUsed` varchar(64);