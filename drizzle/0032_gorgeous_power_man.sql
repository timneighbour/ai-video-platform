CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(512) NOT NULL,
	`excerpt` text,
	`content` longtext NOT NULL,
	`coverImage` varchar(1024),
	`author` varchar(255) NOT NULL DEFAULT 'WizVid Team',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`tags` text,
	`metaTitle` varchar(512),
	`metaDescription` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogPosts_slug_unique` UNIQUE(`slug`)
);
