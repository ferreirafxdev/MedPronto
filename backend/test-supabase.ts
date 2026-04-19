
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    // Try to fetch something simple, like the list of tables or just a health check
    // Since we don't know the schema, we'll try a generic query or just auth check
    console.log('Querying "patients" table...');
    const { data, error } = await supabase.from('patients').select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('Successfully connected to Supabase API!');
        console.log('Note: Table "patients" does not exist yet (Schema needs initialization).');
      } else {
        console.error('Supabase error:', error.message);
        console.error('Error code:', error.code);
      }
    } else {
      console.log('Connection successful! Database is accessible.');
      console.log('Data found:', data);
    }
  } catch (err) {
    console.error('Unexpected error during connection test:', err);
  }
}

testConnection();
