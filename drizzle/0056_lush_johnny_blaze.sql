CREATE TABLE `analyticsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(36) NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`userId` int,
	`event` varchar(128) NOT NULL,
	`category` varchar(64),
	`label` varchar(255),
	`value` varchar(255),
	`path` varchar(512),
	`meta` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyticsEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analyticsPageViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(36) NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`userId` int,
	`path` varchar(512) NOT NULL,
	`title` varchar(512),
	`referrer` varchar(1024),
	`timeOnPage` int DEFAULT 0,
	`scrollDepth` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyticsPageViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analyticsSessions` (
	`id` varchar(36) NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`userId` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`duration` int DEFAULT 0,
	`pageCount` int DEFAULT 1,
	`entryPage` varchar(512),
	`exitPage` varchar(512),
	`referrer` varchar(1024),
	`utmSource` varchar(255),
	`utmMedium` varchar(255),
	`utmCampaign` varchar(255),
	`country` varchar(64),
	`city` varchar(128),
	`device` varchar(32),
	`browser` varchar(64),
	`os` varchar(64),
	`screenWidth` int,
	`bounced` boolean DEFAULT true,
	`converted` boolean DEFAULT false,
	CONSTRAINT `analyticsSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analyticsEvents` ADD CONSTRAINT `analyticsEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analyticsPageViews` ADD CONSTRAINT `analyticsPageViews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analyticsSessions` ADD CONSTRAINT `analyticsSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;