CREATE TABLE `suno_music_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(128) NOT NULL,
	`title` varchar(120),
	`prompt` text,
	`style` varchar(200),
	`instrumental` boolean DEFAULT false,
	`status` enum('pending','processing','complete','failed') DEFAULT 'pending',
	`tracks` longtext,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suno_music_tasks_id` PRIMARY KEY(`id`)
);
