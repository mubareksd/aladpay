CREATE TABLE IF NOT EXISTS `users` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`owner_user_id` char(36) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_members` (
	`company_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` varchar(16) NOT NULL,
	`invited_by` char(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `company_members_company_id_user_id_pk` PRIMARY KEY(`company_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`company_id` char(36),
	`token_hash` varchar(128) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_user_idx` ON `sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pos_published_menu` (
	`company_id` char(36) NOT NULL,
	`menu` json NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `pos_published_menu_company_id` PRIMARY KEY(`company_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pos_guest_orders` (
	`id` char(36) NOT NULL,
	`company_id` char(36) NOT NULL,
	`table_id` varchar(64) NOT NULL,
	`table_label` varchar(255) NOT NULL,
	`order_lines` json NOT NULL,
	`note` text NOT NULL,
	`created_at` bigint NOT NULL,
	`acknowledged` tinyint(1) NOT NULL DEFAULT 0,
	CONSTRAINT `pos_guest_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pos_guest_pending_idx` ON `pos_guest_orders` (`company_id`,`acknowledged`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_invites` (
	`id` char(36) NOT NULL,
	`company_id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` varchar(16) NOT NULL,
	`token` varchar(128) NOT NULL,
	`invited_by` char(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expires_at` datetime NOT NULL,
	`accepted_at` datetime,
	CONSTRAINT `company_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `company_invites_company_idx` ON `company_invites` (`company_id`,`created_at`);
