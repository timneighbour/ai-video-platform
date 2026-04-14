CREATE TABLE `autoSaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`autoSaveToolType` enum('text_to_video','music_video','kids_video','wizpilot') NOT NULL,
	`stateJson` longtext NOT NULL,
	`autoSaveTitle` varchar(255),
	`sourceJobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autoSaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `debugLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`debugCategory` enum('render_failure','character_drift','prompt_mismatch','api_error','face_validation_fail','auto_save_error','general') NOT NULL DEFAULT 'general',
	`debugSeverity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`jobId` int,
	`sceneId` int,
	`debugJobType` varchar(64),
	`message` text NOT NULL,
	`contextJson` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `debugLogs_id` PRIMARY KEY(`id`)
);
