CREATE TABLE `creativeProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'other',
	`bio` text,
	`avatarUrl` varchar(500),
	`colorTheme` varchar(20) NOT NULL DEFAULT '#b8892a',
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `creativeProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creatorProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL DEFAULT 'other',
	`status` varchar(30) NOT NULL DEFAULT 'complete',
	`outputUrl` varchar(1000),
	`thumbnailUrl` varchar(1000),
	`source` varchar(50) DEFAULT 'manual',
	`jobRef` varchar(255),
	`durationSeconds` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `creatorProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(30) NOT NULL,
	`platformUserId` varchar(255),
	`platformUsername` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` bigint,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `socialConnections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialPublishLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`platform` varchar(30) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'pending',
	`platformPostId` varchar(255),
	`platformPostUrl` varchar(1000),
	`errorMessage` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `socialPublishLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizavisionCreatorChannels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(100) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`bio` text,
	`avatarUrl` varchar(1000),
	`bannerUrl` varchar(1000),
	`websiteUrl` varchar(500),
	`youtubeUrl` varchar(500),
	`tiktokUrl` varchar(500),
	`instagramUrl` varchar(500),
	`followerCount` int NOT NULL DEFAULT 0,
	`videoCount` int NOT NULL DEFAULT 0,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`isFeatured` tinyint NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `wizavisionCreatorChannels_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizavisionCreatorChannels_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `wizavisionCreatorChannels_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `wizavisionVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`videoUrl` varchar(1000) NOT NULL,
	`thumbnailUrl` varchar(1000),
	`duration` int,
	`mainCategory` varchar(100) NOT NULL DEFAULT 'music_video',
	`subCategory` varchar(100),
	`genre` varchar(100),
	`visualStyle` varchar(100),
	`mood` varchar(100),
	`tags` text,
	`creatorName` varchar(255),
	`creatorUsername` varchar(100),
	`creatorAvatarUrl` varchar(1000),
	`isPublic` tinyint NOT NULL DEFAULT 1,
	`isFeatured` tinyint NOT NULL DEFAULT 0,
	`isStaffPick` tinyint NOT NULL DEFAULT 0,
	`isKidsSafe` tinyint NOT NULL DEFAULT 0,
	`isOriginal` tinyint NOT NULL DEFAULT 0,
	`viewCount` int NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`sourceType` varchar(50) DEFAULT 'user_upload',
	`projectId` int,
	`metaTitle` varchar(255),
	`metaDescription` varchar(500),
	`publishedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `wizavisionVideos_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizavisionVideos_slug_unique` UNIQUE(`slug`)
);
