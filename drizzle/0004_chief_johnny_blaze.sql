PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`unit_id` text,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`category` text DEFAULT 'sonstiges' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "property_id", "unit_id", "file_name", "file_path", "file_size_bytes", "category", "tags", "created_at") SELECT "id", "property_id", "unit_id", "file_name", "file_path", "file_size_bytes", CASE "category" WHEN 'contract' THEN '09_mietvertraege_mieter' WHEN 'protocol' THEN '09_mietvertraege_mieter' WHEN 'invoice' THEN '06_kosten_rechnungen' ELSE 'sonstiges' END, '[]', "created_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `documents_property_id_idx` ON `documents` (`property_id`);--> statement-breakpoint
CREATE INDEX `documents_unit_id_idx` ON `documents` (`unit_id`);