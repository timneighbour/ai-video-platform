CREATE TABLE `inAppNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`notifType` enum('reminder','system','promo') NOT NULL DEFAULT 'reminder',
	`actionUrl` varchar(512),
	`actionLabel` varchar(64),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inAppNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reEngagementReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`reEngJobType` enum('music_video','text_to_video','kids_video','wizpilot') NOT NULL DEFAULT 'music_video',
	`reminderNumber` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`reEngChannel` enum('in_app','email','owner_notify') NOT NULL DEFAULT 'in_app',
	CONSTRAINT `reEngagementReminders_id` PRIMARY KEY(`id`)
);
