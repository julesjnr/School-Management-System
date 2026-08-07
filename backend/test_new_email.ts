import { db } from "./src/db/index.ts";
import { emailOutbox } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function testNewEmailCreation() {
  console.log("Testing creation of a new email outbox record...");
  const [newRecord] = await db.insert(emailOutbox).values({
    eventKey: `test:verification:${Date.now()}`,
    recipient: "test.verification@example.com",
    subject: "Email Verification Test",
    body: "Testing that new email log records can be created normally.",
    status: "queued",
  }).returning();

  console.log("Created test email record:", newRecord.id);

  const fetched = await db.select().from(emailOutbox).where(eq(emailOutbox.id, newRecord.id));
  console.log("Verified new record exists in DB:", fetched.length === 1);

  // Clean up the test record
  await db.delete(emailOutbox).where(eq(emailOutbox.id, newRecord.id));
  console.log("Test record cleaned up.");

  const finalCount = await db.select().from(emailOutbox);
  console.log("Final outbox count (should be 0):", finalCount.length);

  process.exit(0);
}

testNewEmailCreation();
