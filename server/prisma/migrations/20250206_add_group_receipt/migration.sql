-- Create GroupReceipt table
CREATE TABLE "GroupReceipt" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupReceipt_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on groupId and receiptId
CREATE UNIQUE INDEX "GroupReceipt_groupId_receiptId_key" ON "GroupReceipt"("groupId", "receiptId");

-- Create indexes
CREATE INDEX "GroupReceipt_groupId_idx" ON "GroupReceipt"("groupId");
CREATE INDEX "GroupReceipt_receiptId_idx" ON "GroupReceipt"("receiptId");
CREATE INDEX "GroupReceipt_sharedBy_idx" ON "GroupReceipt"("sharedBy");

-- Add foreign key constraints
ALTER TABLE "GroupReceipt" ADD CONSTRAINT "GroupReceipt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupReceipt" ADD CONSTRAINT "GroupReceipt_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupReceipt" ADD CONSTRAINT "GroupReceipt_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
