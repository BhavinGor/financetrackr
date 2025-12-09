/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_AWS_ACCESS_KEY_ID: string
    readonly VITE_AWS_SECRET_ACCESS_KEY: string
    readonly VITE_BEDROCK_API_KEY: string
    readonly VITE_AWS_REGION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
