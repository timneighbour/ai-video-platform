ALTER TABLE `users` ADD `marketingOptOut` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `marketingOptOutAt` timestamp;