import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const connectionString = process.env.DATABASE_URL;

async function check() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('CONNECTED TO DATABASE');

        const patientsRes = await client.query('SELECT id, name, cpf, birth_date FROM patients');
        console.log('\n--- PATIENTS ---');
        console.log(patientsRes.rows);

        const doctorsRes = await client.query('SELECT id, name, crm, cpf, email FROM doctors');
        console.log('\n--- DOCTORS ---');
        console.log(doctorsRes.rows);

    } catch (err: any) {
        console.error('ERROR:', err.message);
    } finally {
        await client.end();
    }
}

check();
