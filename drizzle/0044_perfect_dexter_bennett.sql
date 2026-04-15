CREATE TABLE `wizSyncJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`audioUrl` varchar(1024) NOT NULL,
	`audioName` varchar(255),
	`audioDuration` decimal(10,3),
	`wizSyncStatus` enum('pending','analysing','ready','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`assemblyAiTranscriptId` varchar(255),
	`demucsRequestId` varchar(255),
	`stems` json,
	`speakerCount` int,
	`utterances` json,
	`musicVideoJobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wizSyncJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizSyncSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wizSyncJobId` int NOT NULL,
	`wizSyncSpeakerId` int NOT NULL,
	`startMs` int NOT NULL,
	`endMs` int NOT NULL,
	`text` text,
	`confidence` decimal(5,4),
	`clipUrl` varchar(1024),
	`hedraGenerationId` varchar(255),
	`lipSyncVideoUrl` varchar(1024),
	`wizSyncLipStatus` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizSyncSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizSyncSpeakers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wizSyncJobId` int NOT NULL,
	`speakerLabel` varchar(8) NOT NULL,
	`wizSyncGender` enum('male','female','unknown') NOT NULL DEFAULT 'unknown',
	`assignedCharacterId` int,
	`isManualOverride` boolean NOT NULL DEFAULT false,
	`displayName` varchar(128),
	`totalDuration` decimal(10,3),
	`instrumentRole` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wizSyncSpeakers_id` PRIMARY KEY(`id`)
);
