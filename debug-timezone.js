import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function debugTimezoneIssue() {
  try {
    console.log('\n=== Timezone Debug ===');
    console.log(`JavaScript Now: ${new Date().toISOString()}`);
    console.log(`JavaScript Now (local): ${new Date().toString()}`);
    console.log(`Timezone offset: ${new Date().getTimezoneOffset()} minutes`);

    // Query database time
    const dbTime = await sql`SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_timestamp`;
    console.log(`Database NOW(): ${JSON.stringify(dbTime[0], null, 2)}`);

    // Create a test code with 10 minute expiry
    const testEmail = 'tz-test-' + Date.now() + '@example.com';
    const testCode = '654321';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`\nLocal Time (Date object):`);
    console.log(`  ISO: ${expiresAt.toISOString()}`);
    console.log(`  Timestamp: ${expiresAt.getTime()}`);
    console.log(`  Local: ${expiresAt.toString()}`);

    // Insert code
    const insertResult = await sql`
      INSERT INTO verification_codes (email, code, attempts, expires_at)
      VALUES (${testEmail}, ${testCode}, 0, ${expiresAt})
      RETURNING expires_at, created_at
    `;
    console.log(`\nStored in DB:`);
    console.log(`  expires_at: ${insertResult[0].expires_at.toISOString()}`);
    console.log(`  expires_at timestamp: ${insertResult[0].expires_at.getTime()}`);
    console.log(`  created_at: ${insertResult[0].created_at.toISOString()}`);

    // Retrieve and check
    const retrieved = await sql`
      SELECT expires_at, created_at FROM verification_codes WHERE email = ${testEmail}
    `;

    console.log(`\nRetrieved from DB:`);
    console.log(`  expires_at: ${retrieved[0].expires_at.toISOString()}`);
    console.log(`  expires_at type: ${typeof retrieved[0].expires_at}`);
    console.log(`  expires_at timestamp: ${retrieved[0].expires_at.getTime()}`);

    const now = new Date();
    console.log(`\nComparison:`);
    console.log(`  Now: ${now.getTime()}`);
    console.log(`  Expires: ${retrieved[0].expires_at.getTime()}`);
    console.log(`  Difference (ms): ${retrieved[0].expires_at.getTime() - now.getTime()}`);
    console.log(`  Is expired: ${now > retrieved[0].expires_at}`);
    console.log(`  Should expire in: ${Math.round((retrieved[0].expires_at.getTime() - now.getTime()) / 1000)} seconds`);

    // Cleanup
    await sql`DELETE FROM verification_codes WHERE email = ${testEmail}`;
    console.log(`\nCleaned up test data`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await sql.end();
  }
}

debugTimezoneIssue();
