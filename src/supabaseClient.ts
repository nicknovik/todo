import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gvvmhuopuvbzmvupjmvf.supabase.co';
const supabaseAnonKey = 'sb_publishable_3JnjMVmgFxr6v96CHdC5rQ_zPGEIExM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
