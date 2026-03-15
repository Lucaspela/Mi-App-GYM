import { createClient } from '@supabase/supabase-js';

// Reemplazamos el 'import.meta.env' por los textos directos
const supabaseUrl = 'https://noghmwynqfbbgoqsjbmy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZ2htd3lucWZiYmdvcXNqYm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMTM0NDEsImV4cCI6MjA4Nzg4OTQ0MX0.H4R54hb9-c3Fznv0Aq1r5uWIl7zro59Lu39iBBhLFDs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
});