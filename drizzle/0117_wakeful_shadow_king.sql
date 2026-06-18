ALTER TABLE `musicVideoJobs` ADD `isFreeTrial` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `freeTrialUsed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `freeTrialUsedAt` timestamp;