ALTER TABLE `videoCharacters` ADD `previewImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `videoCharacters` ADD `previewApproved` boolean DEFAULT false;