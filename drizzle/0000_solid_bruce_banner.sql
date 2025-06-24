-- Migration: Add exchange_rate column to pledge table
ALTER TABLE "pledge" ADD COLUMN "exchange_rate" numeric(10, 4);