ALTER TABLE `musicVideoScenes` ADD `originalVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipsyncedVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `renderProvider` varchar(64);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipSyncProvider` varchar(64);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `renderDurationMs` int;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipSyncDurationMs` int;--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `lipSyncQualityScore` decimal(4,3);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `faceConsistencyScore` decimal(4,3);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `mouthVisibilityScore` decimal(4,3);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `overallSceneScore` decimal(4,3);--> statement-breakpoint
ALTER TABLE `musicVideoScenes` ADD `qualityScoredAt` timestamp;