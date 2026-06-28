import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function testOTPFlow() {
  try {
    const testEmail = 'test-' + Date.now() + '@example.com';
    const testCode = '123456';

    console.log('\n=== OTP Flow Test ===');
    console.log(`Test Email: ${testEmail}`);
    console.log(`Test Code: ${testCode}`);

    // 1. Check initial state
    console.log('\n1. Checking initial state...');
    let existing = await sql`SELECT * FROM verification_codes WHERE email = ${testEmail}`;
    console.log(`   Found ${existing.length} existing codes`);

    // 2. Insert a code (simulating requestCode)
    console.log('\n2. Inserting verification code...');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    
    const insertResult = await sql`
      INSERT INTO verification_codes (email, code, attempts, expires_at)
      VALUES (${testEmail}, ${testCode}, 0, ${expiresAt})
      RETURNING *
    `;
    console.log(`   Inserted:`, insertResult[0]);

    // 3. Query the code back (simulating verifyCode)
    console.log('\n3. Retrieving verification code...');
    const retrieved = await sql`
      SELECT * FROM verification_codes
      WHERE email = ${testEmail}
      ORDER BY created_at DESC
    `;
    console.log(`   Found ${retrieved.length} codes`);
    if (retrieved.length > 0) {
      console.log(`   Code: ${retrieved[0].code}`);
      console.log(`   Attempts: ${retrieved[0].attempts}`);
      console.log(`   Expires At: ${retrieved[0].expires_at}`);
      console.log(`   Created At: ${retrieved[0].created_at}`);
      console.log(`   Is expired: ${new Date() > retrieved[0].expires_at}`);
      console.log(`   Code matches: ${retrieved[0].code === testCode}`);
    }

    // 4. Cleanup
    console.log('\n4. Cleaning up...');
    await sql`DELETE FROM verification_codes WHERE email = ${testEmail}`;
    console.log('   Deleted test code');

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

testOTPFlow();
