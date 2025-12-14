-- Migration: Relationship Integrity and Performance
-- Fixes Issues #1, #2, #3, #4, #5

-- =============================================================================
-- FIX #5: Schema Evolution Tracking
-- Add version tracking to CustomFieldDefinition
-- =============================================================================

ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS "previousVersions" JSONB;

-- =============================================================================
-- FIX #2: Query Performance at Scale
-- Add GIN indexes for faster JSON queries
-- =============================================================================

-- Index on CustomModuleRecord.data for JSON path queries
CREATE INDEX IF NOT EXISTS "idx_custom_record_data_gin" ON "CustomModuleRecord" USING gin("data" jsonb_path_ops);

-- Indexes on built-in module customFields
CREATE INDEX IF NOT EXISTS "idx_lead_custom_fields_gin" ON "Lead" USING gin("customFields" jsonb_path_ops);
CREATE INDEX IF NOT EXISTS "idx_contact_custom_fields_gin" ON "Contact" USING gin("customFields" jsonb_path_ops);
CREATE INDEX IF NOT EXISTS "idx_account_custom_fields_gin" ON "Account" USING gin("customFields" jsonb_path_ops);
CREATE INDEX IF NOT EXISTS "idx_opportunity_custom_fields_gin" ON "Opportunity" USING gin("customFields" jsonb_path_ops);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_custom_record_module_created" ON "CustomModuleRecord" ("moduleId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_custom_record_org_module" ON "CustomModuleRecord" ("orgId", "moduleId");

-- Index for relationship field lookups (Fix #1, #4)
CREATE INDEX IF NOT EXISTS "idx_custom_field_def_related" ON "CustomFieldDefinition" ("orgId", "relatedModule") WHERE "relatedModule" IS NOT NULL;

-- =============================================================================
-- NOTES:
-- 
-- Fix #1 (Referential Integrity): Implemented in application code
--   - cleanupOrphanedRelationships() called on all delete handlers
--   - See: lib/relationships/index.ts
--
-- Fix #3 (Relationship Depth): Implemented in application code  
--   - resolveRelationshipPath() for multi-level traversal
--   - See: lib/relationships/index.ts
--
-- Fix #4 (Relationship Validation): Implemented in application code
--   - validateRelationshipTarget() checks record existence
--   - validateCustomFields() includes relationship validation
--   - See: lib/validation/custom-fields.ts, lib/relationships/index.ts
-- =============================================================================
