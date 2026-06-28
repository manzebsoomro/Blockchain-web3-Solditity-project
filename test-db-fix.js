import 'dotenv/config';
import { createVerificationCode, getVerificationCode, deleteVerificationCode } from './server/db.js';

async function testDBFix() {
  try {
    const testEmail = 'dbfix-' + Date.now() + '@example.com';
    const testCode = '999888';

    console.log('\n=== DB Function Test (after fix) ===');
    console.log(`Test Email: ${testEmail}`);
    console.log(`Test Code: ${testCode}`);

    // Insert using the fixed function
    console.log('\n1. Creating verification code with fixed function...');
    const now = Date.now();
    await createVerificationCode(testEmail, testCode, 10); // 10 minute expiry
    console.log(`   Inserted at: ${new Date().toISOString()}`);

    // Retrieve the code
    console.log('\n2. Retrieving verification code...');
    const retrieved = await getVerificationCode(testEmail);
    if (retrieved) {
      console.log(`   Code: ${retrieved.code}`);
      console.log(`   Attempts: ${retrieved.attempts}`);
      console.log(`   Expires At: ${retrieved.expiresAt}`);
      console.log(`   Expires At ISO: ${retrieved.expiresAt.toISOString()}`);
      console.log(`   Expires At Timestamp: ${retrieved.expiresAt.getTime()}`);
      
      const nowTime = new Date().getTime();
      const expiresTime = retrieved.expiresAt.getTime();
      const diffMs = expiresTime - nowTime;
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);

      console.log(`   Current time: ${nowTime}`);
      console.log(`   Expires time: ${expiresTime}`);
      console.log(`   Difference: ${diffMs}ms (${diffMins}min, ${diffSecs}sec)`);
      console.log(`   Is expired: ${new Date() > retrieved.expiresAt}`);
      console.log(`   Code matches: ${retrieved.code === testCode}`);

      if (diffMins >= 9 && diffMins <= 11) {
        console.log(`   ✅ SUCCESS: Code expires in ~10 minutes (as expected)`);
      } else {
        console.log(`   ❌ ERROR: Code should expire in ~10 minutes, but expires in ${diffMins} minutes`);
      }
    } else {
      console.log(`   ❌ ERROR: Code not found`);
    }

    // Cleanup
    console.log('\n3. Cleaning up...');
    await deleteVerificationCode(testEmail);
    console.log('   Deleted test code');

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testDBFix();
