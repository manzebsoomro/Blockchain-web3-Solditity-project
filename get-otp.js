import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function getOTPCode() {
  try {
    const codes = await sql`
      SELECT email, code, expires_at FROM verification_codes 
      WHERE email = 'testuser@example.com'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (codes.length === 0) {
      console.log('No verification codes found for testuser@example.com');
    } else {
      console.log('Found OTP code:');
      console.log(`  Email: ${codes[0].email}`);
      console.log(`  Code: ${codes[0].code}`);
      console.log(`  Expires: ${codes[0].expires_at.toISOString()}`);
      
      const now = new Date();
      const expiresTime = codes[0].expires_at.getTime();
      const nowTime = now.getTime();
      const diffMin = Math.round((expiresTime - nowTime) / 60000);
      console.log(`  Expires in: ~${diffMin} minutes`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

getOTPCode();
