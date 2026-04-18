import dotenv from 'dotenv';
import postgres from 'postgres';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
    try {
        console.log('Running migration...');
        
        // Add Stripe fields to patients
        await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;`;
        await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS subscription_id TEXT;`;
        await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';`;
        
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
