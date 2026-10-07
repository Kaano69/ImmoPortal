ALTER TABLE `properties` ADD `monthly_loan_payment_cents` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `annual_costs_cents` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `annual_maintenance_reserve_cents` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `vacancy_reserve_percent` real;--> statement-breakpoint
ALTER TABLE `properties` ADD `is_archived` integer DEFAULT false NOT NULL;