ALTER TABLE "mint_requests" ADD COLUMN "amount" integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "required_eth_wei" varchar(78) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "payment_tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "sweep_tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "mint_tx_hash" varchar(66);--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "swept_at" timestamp;--> statement-breakpoint
ALTER TABLE "mint_requests" ADD COLUMN "minted_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "kind" varchar(16) DEFAULT 'mint' NOT NULL;