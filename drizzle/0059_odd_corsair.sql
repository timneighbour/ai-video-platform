CREATE TABLE `dataRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dataRequestType` enum('deletion','export') NOT NULL,
	`dataRequestStatus` enum('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`notes` text,
	CONSTRAINT `dataRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizPerformerConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`characterId` int,
	`policyVersion` varchar(32) NOT NULL DEFAULT '2026-04-21',
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`consentHasRight` boolean NOT NULL DEFAULT false,
	`consentAgeVerified` boolean NOT NULL DEFAULT false,
	`consentAiProcessing` boolean NOT NULL DEFAULT false,
	`consentPrivacyPolicy` boolean NOT NULL DEFAULT false,
	`withdrawnAt` timestamp,
	CONSTRAINT `wizPerformerConsents_id` PRIMARY KEY(`id`)
);
