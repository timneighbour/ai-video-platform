CREATE TABLE `wizadora_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key_hash` varchar(64) NOT NULL,
	`key_prefix` varchar(20) NOT NULL,
	`label` varchar(100) NOT NULL,
	`owner_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_admin` boolean NOT NULL DEFAULT false,
	`last_used_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	CONSTRAINT `wizadora_api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizadora_api_keys_key_hash_unique` UNIQUE(`key_hash`)
);
--> statement-breakpoint
CREATE TABLE `wizadora_idempotency_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotency_key` varchar(200) NOT NULL,
	`user_id` int NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`request_hash` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `wizadora_idempotency_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizadora_idempotency_keys_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `wizadora_jobs` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`api_key_id` int,
	`prompt` text NOT NULL,
	`negative_prompt` text,
	`duration` int NOT NULL DEFAULT 5,
	`resolution` varchar(20) NOT NULL DEFAULT '720p',
	`aspect_ratio` varchar(10) NOT NULL DEFAULT '16:9',
	`style` varchar(50) NOT NULL DEFAULT 'cinematic',
	`motion_intensity` varchar(20) DEFAULT 'medium',
	`provider` varchar(50) NOT NULL DEFAULT 'atlas_cloud',
	`provider_job_id` varchar(200),
	`idempotency_key` varchar(200),
	`wizadora_job_status` enum('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`estimated_cost` decimal(10,4),
	`actual_cost` decimal(10,4),
	`credits_reserved` int NOT NULL DEFAULT 0,
	`credits_charged` int NOT NULL DEFAULT 0,
	`output_video_url` text,
	`thumbnail_url` text,
	`error_code` varchar(50),
	`error_message` text,
	`moderation_blocked` boolean NOT NULL DEFAULT false,
	`moderation_reason` varchar(200),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`started_at` timestamp,
	`completed_at` timestamp,
	`failed_at` timestamp,
	`cancelled_at` timestamp,
	CONSTRAINT `wizadora_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizadora_jobs_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `wizadora_provider_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_job_id` varchar(200),
	`request_payload_hash` varchar(64),
	`idempotency_key` varchar(200),
	`estimated_cost` decimal(10,4),
	`actual_cost` decimal(10,4),
	`wizadora_provider_status` enum('submitted','completed','failed','cancelled') NOT NULL DEFAULT 'submitted',
	`error_code` varchar(50),
	`error_message` text,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`failed_at` timestamp,
	CONSTRAINT `wizadora_provider_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wizadora_spend_caps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`per_job_cap_gbp` decimal(10,4) NOT NULL DEFAULT '2.00',
	`daily_cap_gbp` decimal(10,4) NOT NULL DEFAULT '20.00',
	`monthly_cap_gbp` decimal(10,4) NOT NULL DEFAULT '100.00',
	`account_cap_gbp` decimal(10,4) NOT NULL DEFAULT '500.00',
	`daily_spent_gbp` decimal(10,4) NOT NULL DEFAULT '0.00',
	`monthly_spent_gbp` decimal(10,4) NOT NULL DEFAULT '0.00',
	`total_spent_gbp` decimal(10,4) NOT NULL DEFAULT '0.00',
	`daily_reset_at` timestamp,
	`monthly_reset_at` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wizadora_spend_caps_id` PRIMARY KEY(`id`),
	CONSTRAINT `wizadora_spend_caps_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `wizadora_webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`endpoint_url` text,
	`payload_hash` varchar(64),
	`signature` varchar(128),
	`wizadora_webhook_status` enum('pending','delivered','failed','skipped') NOT NULL DEFAULT 'pending',
	`attempt_count` int NOT NULL DEFAULT 0,
	`last_attempt_at` timestamp,
	`next_retry_at` timestamp,
	`response_code` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`delivered_at` timestamp,
	CONSTRAINT `wizadora_webhook_logs_id` PRIMARY KEY(`id`)
);
