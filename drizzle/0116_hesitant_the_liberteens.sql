CREATE TABLE `stripeProcessedEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stripeProcessedEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripeProcessedEvents_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `grokVideoFirstFrameUrl` varchar(1024);