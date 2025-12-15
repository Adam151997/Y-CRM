-- AlterTable
ALTER TABLE "Note" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';
