CREATE TABLE `pay_per_video_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`project_id` int NOT NULL,
	`stripe_session_id` varchar(512) NOT NULL,
	`scene_count` int NOT NULL,
	`amount_pence` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pay_per_video_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pay_per_video_orders_stripe_session_id_unique` UNIQUE(`stripe_session_id`)
);
