-- Retrofit for the in-process `inFlightSeeds` lock in
-- ensure-default-business-rules.ts: two concurrent requests for an
-- organization with no rules yet could both pass the
-- countByOrganization === 0 check before either had inserted anything,
-- double-seeding the four defaults. This partial unique index lets
-- createMany({ skipDuplicates: true }) do the deduplication at the database
-- level instead, so the check-then-act race can't happen even if the
-- in-process lock is ever removed (e.g. if the API scales to multiple
-- instances, where an in-process Map can't coordinate at all).
--
-- Scoped to isDefault = true only (not representable as a plain @@unique in
-- schema.prisma, which has no partial-index syntax) so user-created custom
-- rules are never constrained by this — a user can still name their own rule
-- anything, including a name that happens to match a default's.
CREATE UNIQUE INDEX "business_rules_default_org_name_key"
  ON "business_rules" ("organizationId", "name")
  WHERE "isDefault" = true;
