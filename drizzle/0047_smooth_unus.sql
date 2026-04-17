CREATE TABLE `wizImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`prompt` text NOT NULL,
	`style` varchar(64),
	`aspectRatio` varchar(16),
	`imageUrl` varchar(1024) NOT NULL,
	`imageKey` varchar(512),
	`revisedPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizShortsJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` text NOT NULL,
	`platform` enum('youtube_shorts','tiktok','reels') NOT NULL DEFAULT 'youtube_shorts',
	`targetDuration` int NOT NULL DEFAULT 30,
	`visualStyle` varchar(64),
	`musicUrl` varchar(1024),
	`sceneCount` int,
	`creditCost` int NOT NULL DEFAULT 0,
	`videoUrl` varchar(1024),
	`videoKey` varchar(512),
	`wizShortsStatus` enum('pending','generating_scenes','rendering','assembling','complete','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizShortsJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizShortsScenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`sceneIndex` int NOT NULL,
	`prompt` text NOT NULL,
	`duration` int NOT NULL DEFAULT 5,
	`caption` text,
	`taskId` varchar(255),
	`videoUrl` varchar(1024),
	`videoKey` varchar(512),
	`wizShortSceneStatus` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizShortsScenes_id` PRIMARY KEY(`id`)
);
