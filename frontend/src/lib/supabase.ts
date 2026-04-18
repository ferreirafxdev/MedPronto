import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing. Please check your .env file.');
}

// O cliente Supabase v2+ lida bem com a maioria das conexões.
// Diferente do backend, no browser a resolução de DNS é gerenciada pelo navegador.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
