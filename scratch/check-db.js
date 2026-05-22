const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

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

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await client.end();
    }
}

check();
