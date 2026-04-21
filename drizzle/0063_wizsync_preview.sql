ALTER TABLE `wizSyncSegments` ADD `previewVideoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `wizSyncSegments` ADD `wizSyncPreviewStatus` enum('idle','generating','ready','error') DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE `wizSyncSegments` ADD `previewAtlasJobId` varchar(255);