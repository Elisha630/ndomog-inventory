/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EXTERNAL_SUPABASE_URL: string;
  readonly VITE_EXTERNAL_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
