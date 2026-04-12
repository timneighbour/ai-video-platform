CREATE TABLE `renderBundles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bundleSize` int NOT NULL,
	`remaining` int NOT NULL,
	`stripeSessionId` varchar(255),
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `renderBundles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `renderJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceJobId` int,
	`sourceJobType` enum('music_video','text_to_video','kids_video','wizpilot') NOT NULL DEFAULT 'music_video',
	`quality` enum('standard','hd','4k') NOT NULL DEFAULT 'standard',
	`audioTier` enum('standard','enhanced','cinematic') NOT NULL DEFAULT 'standard',
	`basePrice` int NOT NULL DEFAULT 0,
	`audioAddon` int NOT NULL DEFAULT 0,
	`totalPrice` int NOT NULL DEFAULT 0,
	`paymentStatus` enum('free','pending','paid','failed','subscription') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`stripeSessionId` varchar(255),
	`renderStatus` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`downloadUrl` varchar(1024),
	`downloadKey` varchar(512),
	`expiresAt` timestamp,
	`usedSubscriptionRender` boolean NOT NULL DEFAULT false,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `renderJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionRenderAllowances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`totalAllowed` int NOT NULL,
	`used` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionRenderAllowances_id` PRIMARY KEY(`id`)
);
