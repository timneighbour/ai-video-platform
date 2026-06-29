ALTER TABLE `subscriptions` ADD `amountPaid` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currency` varchar(8);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billingInterval` varchar(16);