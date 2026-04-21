CREATE TABLE `topupPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packKey` varchar(64) NOT NULL,
	`packName` varchar(128) NOT NULL,
	`creditsAdded` int NOT NULL,
	`amountPaid` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'gbp',
	`stripeSessionId` varchar(255) NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topupPurchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `topupPurchases_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
--> statement-breakpoint
ALTER TABLE `credits` ADD `monthlyCredits` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `credits` ADD `topupCredits` int DEFAULT 0 NOT NULL;