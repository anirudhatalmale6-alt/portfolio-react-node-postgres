import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// Usage: npm run create-admin -- you@example.com "a-strong-password" "Your Name"
const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password> [display name]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const { rows } = await pool.query(
  `INSERT INTO admin_users (email, password_hash, display_name)
   VALUES ($1, $2, $3)
   ON CONFLICT (lower(email)) DO UPDATE SET password_hash = EXCLUDED.password_hash,
                                            display_name  = EXCLUDED.display_name
   RETURNING id, email, display_name`,
  [email, hash, name || 'Admin'],
);

console.log(`admin ready: ${rows[0].email} (id ${rows[0].id})`);
await pool.end();
