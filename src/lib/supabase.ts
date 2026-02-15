import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://obyxyrqbuqlusxpknrgq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieXh5cnFidXFsdXN4cGtucmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTI2MTEsImV4cCI6MjA4NTM4ODYxMX0.EzLkguFOnsavwLXXBaiGMXWM6xsn9Ax-nt8vMI2bXuI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
