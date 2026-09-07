-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('DISCOVERED', 'RESEARCHING', 'QUALIFIED', 'AUDIT_REQUESTED', 'AUDITED', 'DEMO_READY', 'OUTREACH', 'ENGAGED', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('REVIEW', 'QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "DisqualificationReason" AS ENUM ('AGENCY_MANAGED', 'OUT_OF_AREA', 'WRONG_CATEGORY', 'BUSINESS_CLOSED', 'DUPLICATE', 'NO_RELEVANT_OPPORTUNITY', 'NOT_REACHABLE', 'TOO_SMALL', 'OTHER');

-- CreateEnum
CREATE TYPE "IdentityKind" AS ENUM ('PROVIDER_PLACE_ID', 'ROOT_DOMAIN', 'PHONE_E164', 'ADDRESS_HASH');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('PHONE', 'EMAIL', 'BOOKING_URL', 'SOCIAL_URL', 'OTHER_URL');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('NOT_ATTEMPTED', 'QUEUED', 'OK', 'LIMITED', 'UNREACHABLE', 'TIMEOUT', 'BLOCKED_BY_POLICY', 'INVALID_URL', 'TOO_LARGE', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscoveryDecision" AS ENUM ('PENDING', 'ADDED', 'REJECTED', 'ALREADY_TRACKED');

-- CreateEnum
CREATE TYPE "SavedSearchKind" AS ENUM ('DISCOVERY', 'PROSPECT_VIEW');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('BUSINESS_CATEGORY', 'GOOGLE_RATING', 'GOOGLE_REVIEW_COUNT', 'BUSINESS_CLOSED', 'PHONE_PRESENT', 'PUBLIC_EMAIL_PRESENT', 'WEBSITE_PRESENT', 'WEBSITE_REACHABLE', 'WEBSITE_FETCH_FAILED', 'HTTPS_PRESENT', 'TITLE_PRESENT', 'META_DESCRIPTION_PRESENT', 'VIEWPORT_META_PRESENT', 'CONTACT_LINK_PRESENT', 'BOOKING_LINK_PRESENT', 'PHONE_LINK_PRESENT', 'SOCIAL_LINK_PRESENT', 'CMS_HINT', 'AGENCY_CREDIT_DETECTED', 'DOMAIN_REDIRECT', 'IN_TARGET_GEOGRAPHY', 'RENDER_REQUIRED');

-- CreateEnum
CREATE TYPE "SignalSource" AS ENUM ('GOOGLE_PLACES', 'DEMO_PROVIDER', 'WEBSITE_FETCH', 'MANUAL', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ScoreDimension" AS ENUM ('BUSINESS_FIT', 'BUSINESS_STRENGTH', 'WEBSITE_OPPORTUNITY', 'REACHABILITY', 'DISQUALIFIER');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('OPEN', 'MERGED', 'KEPT_SEPARATE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ExternalSystem" AS ENUM ('AUDIT_WORKSPACE', 'DEMO_FACTORY');

-- CreateEnum
CREATE TYPE "ExternalRefStatus" AS ENUM ('PENDING_HANDOFF', 'SENT', 'ACKNOWLEDGED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('WEBSITE_ENRICHMENT', 'SCREENSHOT_CAPTURE', 'BULK_SCORE', 'DISCOVERY_DETAILS', 'INTEGRATION_HANDOFF', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PROSPECT_DISCOVERED', 'PROSPECT_ADDED', 'PROSPECT_UPDATED', 'PROSPECT_ENRICHED', 'PROSPECT_SCORED', 'PROSPECT_QUALIFIED', 'PROSPECT_DISQUALIFIED', 'QUALIFICATION_OVERRIDDEN', 'STAGE_CHANGED', 'NOTE_ADDED', 'AUDIT_REQUESTED', 'AUDIT_LINKED', 'DEMO_REQUESTED', 'OUTREACH_MARKED', 'DUPLICATE_MERGED', 'DUPLICATE_DISMISSED', 'IMPORT_COMPLETED', 'DISCOVERY_RUN_COMPLETED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('DRAFT', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clerkOrgId" TEXT,
    "isFixture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "primaryCategory" TEXT,
    "secondaryCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'DISCOVERED',
    "qualification" "Qualification" NOT NULL DEFAULT 'REVIEW',
    "disqualificationReason" "DisqualificationReason",
    "qualificationNote" TEXT,
    "qualificationOverridden" BOOLEAN NOT NULL DEFAULT false,
    "qualifiedByUserId" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "primaryWebsiteId" TEXT,
    "primaryLocationId" TEXT,
    "opportunityScore" INTEGER,
    "businessStrengthScore" INTEGER,
    "websiteOpportunityScore" INTEGER,
    "businessFitScore" INTEGER,
    "reachabilityScore" INTEGER,
    "scoredAt" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "agencyManaged" BOOLEAN NOT NULL DEFAULT false,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "region" TEXT,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectIdentity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "kind" "IdentityKind" NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "line1" TEXT,
    "line2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "formatted" TEXT,
    "normalized" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessContact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "kind" "ContactKind" NOT NULL,
    "value" TEXT NOT NULL,
    "normalized" TEXT,
    "label" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "finalUrl" TEXT,
    "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED',
    "enrichmentError" TEXT,
    "lastEnrichedAt" TIMESTAMP(3),
    "httpStatus" INTEGER,
    "usesHttps" BOOLEAN,
    "title" TEXT,
    "metaDescription" TEXT,
    "responseMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'RUNNING',
    "category" TEXT NOT NULL,
    "locationText" TEXT NOT NULL,
    "radiusMeters" INTEGER,
    "minRating" DOUBLE PRECISION,
    "minReviews" INTEGER,
    "websiteFilter" TEXT NOT NULL DEFAULT 'any',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "decision" "DiscoveryDecision" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "formattedAddress" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "businessStatus" TEXT,
    "prospectId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "SavedSearchKind" NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "raw" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "source" "SignalSource" NOT NULL,
    "sourceReference" TEXT,
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "value" TEXT,
    "numericValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    "evidence" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "businessFitScore" INTEGER NOT NULL,
    "businessStrengthScore" INTEGER NOT NULL,
    "websiteOpportunityScore" INTEGER NOT NULL,
    "reachabilityScore" INTEGER NOT NULL,
    "suggestedQualification" "Qualification" NOT NULL,
    "disqualifiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreComponent" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "dimension" "ScoreDimension" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "signalTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScoreComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStageHistory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "fromStage" "PipelineStage",
    "toStage" "PipelineStage" NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectNote" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectTag" (
    "prospectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectTag_pkey" PRIMARY KEY ("prospectId","tagId")
);

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectAId" TEXT NOT NULL,
    "prospectBId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DuplicateStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "system" "ExternalSystem" NOT NULL,
    "status" "ExternalRefStatus" NOT NULL DEFAULT 'PENDING_HANDOFF',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "externalStatus" TEXT,
    "summary" JSONB,
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenshotReference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "websiteId" TEXT,
    "provider" TEXT NOT NULL,
    "storageKey" TEXT,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenshotReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prospectId" TEXT,
    "type" "ActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "runId" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "reportedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "filename" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'DRAFT',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_clerkOrgId_key" ON "Workspace"("clerkOrgId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_primaryWebsiteId_key" ON "Prospect"("primaryWebsiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_primaryLocationId_key" ON "Prospect"("primaryLocationId");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_pipelineStage_idx" ON "Prospect"("workspaceId", "pipelineStage");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_qualification_idx" ON "Prospect"("workspaceId", "qualification");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_opportunityScore_idx" ON "Prospect"("workspaceId", "opportunityScore");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_lastActivityAt_idx" ON "Prospect"("workspaceId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_normalizedName_idx" ON "Prospect"("workspaceId", "normalizedName");

-- CreateIndex
CREATE INDEX "Prospect_workspaceId_primaryCategory_idx" ON "Prospect"("workspaceId", "primaryCategory");

-- CreateIndex
CREATE INDEX "ProspectIdentity_prospectId_idx" ON "ProspectIdentity"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectIdentity_workspaceId_kind_namespace_value_key" ON "ProspectIdentity"("workspaceId", "kind", "namespace", "value");

-- CreateIndex
CREATE INDEX "BusinessLocation_workspaceId_city_idx" ON "BusinessLocation"("workspaceId", "city");

-- CreateIndex
CREATE INDEX "BusinessLocation_prospectId_idx" ON "BusinessLocation"("prospectId");

-- CreateIndex
CREATE INDEX "BusinessContact_workspaceId_kind_normalized_idx" ON "BusinessContact"("workspaceId", "kind", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessContact_prospectId_kind_value_key" ON "BusinessContact"("prospectId", "kind", "value");

-- CreateIndex
CREATE INDEX "Website_workspaceId_rootDomain_idx" ON "Website"("workspaceId", "rootDomain");

-- CreateIndex
CREATE INDEX "Website_prospectId_idx" ON "Website"("prospectId");

-- CreateIndex
CREATE INDEX "DiscoveryRun_workspaceId_startedAt_idx" ON "DiscoveryRun"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "DiscoveryResult_workspaceId_runId_decision_idx" ON "DiscoveryResult"("workspaceId", "runId", "decision");

-- CreateIndex
CREATE INDEX "DiscoveryResult_runId_idx" ON "DiscoveryResult"("runId");

-- CreateIndex
CREATE INDEX "SavedSearch_workspaceId_kind_idx" ON "SavedSearch"("workspaceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearch_workspaceId_kind_name_key" ON "SavedSearch"("workspaceId", "kind", "name");

-- CreateIndex
CREATE INDEX "ProspectSource_prospectId_idx" ON "ProspectSource"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectSource_workspaceId_provider_externalId_key" ON "ProspectSource"("workspaceId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "ProspectSignal_workspaceId_type_idx" ON "ProspectSignal"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectSignal_prospectId_type_source_key" ON "ProspectSignal"("prospectId", "type", "source");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_prospectId_createdAt_idx" ON "ScoreSnapshot"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_workspaceId_createdAt_idx" ON "ScoreSnapshot"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreComponent_snapshotId_idx" ON "ScoreComponent"("snapshotId");

-- CreateIndex
CREATE INDEX "PipelineStageHistory_prospectId_createdAt_idx" ON "PipelineStageHistory"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectNote_prospectId_createdAt_idx" ON "ProspectNote"("prospectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "ProspectTag_tagId_idx" ON "ProspectTag"("tagId");

-- CreateIndex
CREATE INDEX "DuplicateCandidate_workspaceId_status_idx" ON "DuplicateCandidate"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateCandidate_prospectAId_prospectBId_key" ON "DuplicateCandidate"("prospectAId", "prospectBId");

-- CreateIndex
CREATE INDEX "ExternalReference_workspaceId_system_status_idx" ON "ExternalReference"("workspaceId", "system", "status");

-- CreateIndex
CREATE INDEX "ExternalReference_prospectId_system_idx" ON "ExternalReference"("prospectId", "system");

-- CreateIndex
CREATE INDEX "ScreenshotReference_prospectId_capturedAt_idx" ON "ScreenshotReference"("prospectId", "capturedAt");

-- CreateIndex
CREATE INDEX "Job_state_runAfter_idx" ON "Job"("state", "runAfter");

-- CreateIndex
CREATE INDEX "Job_workspaceId_type_state_idx" ON "Job"("workspaceId", "type", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ActivityEvent_workspaceId_createdAt_idx" ON "ActivityEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_prospectId_createdAt_idx" ON "ActivityEvent"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderUsage_workspaceId_provider_createdAt_idx" ON "ProviderUsage"("workspaceId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_workspaceId_createdAt_idx" ON "ImportBatch"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_primaryWebsiteId_fkey" FOREIGN KEY ("primaryWebsiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectIdentity" ADD CONSTRAINT "ProspectIdentity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectIdentity" ADD CONSTRAINT "ProspectIdentity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessContact" ADD CONSTRAINT "BusinessContact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessContact" ADD CONSTRAINT "BusinessContact_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryResult" ADD CONSTRAINT "DiscoveryResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryResult" ADD CONSTRAINT "DiscoveryResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryResult" ADD CONSTRAINT "DiscoveryResult_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSource" ADD CONSTRAINT "ProspectSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSource" ADD CONSTRAINT "ProspectSource_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSignal" ADD CONSTRAINT "ProspectSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSignal" ADD CONSTRAINT "ProspectSignal_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreComponent" ADD CONSTRAINT "ScoreComponent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ScoreSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStageHistory" ADD CONSTRAINT "PipelineStageHistory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStageHistory" ADD CONSTRAINT "PipelineStageHistory_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectNote" ADD CONSTRAINT "ProspectNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectNote" ADD CONSTRAINT "ProspectNote_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectTag" ADD CONSTRAINT "ProspectTag_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectTag" ADD CONSTRAINT "ProspectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_prospectAId_fkey" FOREIGN KEY ("prospectAId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_prospectBId_fkey" FOREIGN KEY ("prospectBId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotReference" ADD CONSTRAINT "ScreenshotReference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotReference" ADD CONSTRAINT "ScreenshotReference_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotReference" ADD CONSTRAINT "ScreenshotReference_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUsage" ADD CONSTRAINT "ProviderUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUsage" ADD CONSTRAINT "ProviderUsage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
