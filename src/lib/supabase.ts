import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
// SSR 빌드 타임에 RLS를 우회하기 위해 SERVICE_ROLE_KEY를 우선적으로 사용 (보안상 클라이언트에 노출 안됨)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
