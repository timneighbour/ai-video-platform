CREATE TABLE `broadcast_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(500) NOT NULL,
	`bodyHtml` longtext NOT NULL,
	`recipientCount` int NOT NULL DEFAULT 0,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`sentBy` int,
	CONSTRAINT `broadcast_emails_id` PRIMARY KEY(`id`)
);
