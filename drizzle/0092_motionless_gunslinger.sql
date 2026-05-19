CREATE TABLE `musicVideoVocalStems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`stemIndex` int NOT NULL DEFAULT 0,
	`stemUrl` varchar(1024) NOT NULL,
	`stemKey` varchar(512) NOT NULL,
	`characterId` int,
	`characterName` varchar(255),
	`voiceGender` enum('male','female','unknown') DEFAULT 'unknown',
	`voiceLabel` varchar(128),
	`isLeadVocal` boolean NOT NULL DEFAULT false,
	`diarisationStatus` varchar(32) DEFAULT 'done',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `musicVideoVocalStems_id` PRIMARY KEY(`id`)
);
