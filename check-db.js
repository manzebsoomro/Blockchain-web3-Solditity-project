import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);
try {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables in database:');
  tables.forEach(t => console.log('  -', t.table_name));
  
  console.log('\nChecking verification_codes table...');
  const codeCount = await sql`SELECT COUNT(*) as count FROM verification_codes`;
  console.log('Total verification codes:', codeCount[0].count);
  
  const sampleCodes = await sql`SELECT id, email, code, attempts, expires_at, created_at FROM verification_codes ORDER BY created_at DESC LIMIT 5`;
  console.log('\nLast 5 verification codes:');
  console.log(JSON.stringify(sampleCodes, null, 2));
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}
