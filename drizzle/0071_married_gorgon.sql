ALTER TABLE `musicVideoJobs` ADD `qualityStatus` enum('pending','previewing','approved','rerender_requested','rerendering') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `downloadedAt` timestamp;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `reRenderCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `reRenderReason` text;--> statement-breakpoint
ALTER TABLE `musicVideoJobs` ADD `reRenderRequestedAt` timestamp;