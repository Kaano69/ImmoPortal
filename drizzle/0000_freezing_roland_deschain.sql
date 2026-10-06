CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`unit_id` text,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_property_id_idx` ON `documents` (`property_id`);--> statement-breakpoint
CREATE INDEX `documents_unit_id_idx` ON `documents` (`unit_id`);--> statement-breakpoint
CREATE TABLE `leases` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`deposit_cents` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "leases_end_after_start_check" CHECK("leases"."end_date" IS NULL OR "leases"."end_date" >= "leases"."start_date")
);
--> statement-breakpoint
CREATE INDEX `leases_unit_id_idx` ON `leases` (`unit_id`);--> statement-breakpoint
CREATE INDEX `leases_tenant_id_idx` ON `leases` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `leases_one_active_per_unit_idx` ON `leases` (`unit_id`) WHERE "leases"."is_active" = 1;--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`street` text NOT NULL,
	`zip` text NOT NULL,
	`city` text NOT NULL,
	`purchase_year` integer,
	`total_sqm` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`unit_id` text,
	`amount_cents` integer NOT NULL,
	`type` text NOT NULL,
	`due_date` text NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_property_id_idx` ON `transactions` (`property_id`);--> statement-breakpoint
CREATE INDEX `transactions_unit_id_idx` ON `transactions` (`unit_id`);--> statement-breakpoint
CREATE INDEX `transactions_due_date_idx` ON `transactions` (`due_date`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`unit_number` text NOT NULL,
	`type` text NOT NULL,
	`sqm` real,
	`cold_rent_cents` integer DEFAULT 0 NOT NULL,
	`additional_costs_cents` integer DEFAULT 0 NOT NULL,
	`is_vacant` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_property_id_unit_number_idx` ON `units` (`property_id`,`unit_number`);