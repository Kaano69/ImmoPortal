CREATE TABLE `document_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`detected_property_id` text,
	`detected_category` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`detected_property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `document_inbox_status_idx` ON `document_inbox` (`status`);--> statement-breakpoint
ALTER TABLE `leases` ADD `deposit_status` text DEFAULT 'missing' NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `deposit_received_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `deposit_bank_account` text;--> statement-breakpoint
ALTER TABLE `leases` ADD `deposit_proof_document_id` text REFERENCES documents(id);