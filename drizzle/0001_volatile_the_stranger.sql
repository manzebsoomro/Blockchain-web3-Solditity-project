ALTER TABLE "wallets" ADD COLUMN "encrypted_private_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "private_key_iv" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "private_key_auth_tag" varchar(32) DEFAULT '' NOT NULL;