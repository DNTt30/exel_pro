import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createJevHandler } from './handler.js';

Deno.serve(createJevHandler({ createClient, env: key => Deno.env.get(key) }));
