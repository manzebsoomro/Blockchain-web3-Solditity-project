import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function debugPostgresDateHandling() {
  try {
    console.log('\n=== Debug Postgres Date Handling ===\n');

    const testEmail = 'debug-' + Date.now() + '@example.com';
    const testCode = '777666';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`JavaScript Date:`);
    console.log(`  Value: ${expiresAt}`);
    console.log(`  ISO: ${expiresAt.toISOString()}`);
    console.log(`  Timestamp: ${expiresAt.getTime()}`);

    console.log(`\nInserting with Date object...`);
    const result = await sql`
      INSERT INTO verification_codes (email, code, attempts, expires_at)
      VALUES (${testEmail}, ${testCode}, 0, ${expiresAt})
      RETURNING *
    `;

    console.log(`Inserted expires_at: ${result[0].expires_at.toISOString()}`);
    console.log(`Inserted expires_at timestamp: ${result[0].expires_at.getTime()}`);

    // Check what was stored
    const retrieved = await sql`
      SELECT expires_at FROM verification_codes WHERE email = ${testEmail}
    `;

    console.log(`\nRetrieved from DB:`);
    console.log(`  ISO: ${retrieved[0].expires_at.toISOString()}`);
    console.log(`  Timestamp: ${retrieved[0].expires_at.getTime()}`);
    
    const diffMs = retrieved[0].expires_at.getTime() - expiresAt.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    console.log(`  Difference from original: ${diffMinutes} minutes (${diffMs}ms)`);

    // Test raw SQL with NOW()
    console.log(`\n\nTesting raw SQL with NOW() + INTERVAL:`);
    const rawResult = await sql`
      SELECT NOW() as now_time, (NOW() + INTERVAL '10 minutes') as expires_time
    `;
    console.log(`  NOW(): ${rawResult[0].now_time.toISOString()}`);
    console.log(`  NOW() + 10min: ${rawResult[0].expires_time.toISOString()}`);

    // Cleanup
    await sql`DELETE FROM verification_codes WHERE email = ${testEmail}`;
    await sql.end();

    console.log(`\n=== Debug Complete ===\n`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPostgresDateHandling();
