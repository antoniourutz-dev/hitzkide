# Hitzkideak

Aplicacion web hecha con Vite + React para practicar sinonimos en euskera, cloze tests y conectores discursivos. El frontend consume datos desde Supabase y esta preparada para despliegue estatico en Vercel.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Supabase JS 2
- `vite-plugin-pwa` para instalacion y modo offline

## Puesta en marcha local

### Requisitos

- Node.js 20 o superior
- Un proyecto de Supabase con las tablas y vistas que usa la app

### Instalacion

```bash
npm install
```

### Variables de entorno

Crea un archivo `.env.local` con:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

La app usa estas variables tanto en local como en despliegue. El archivo `.env.local` no se sube al repositorio.

### Desarrollo

```bash
npm run dev
```

### Verificacion

```bash
npm run typecheck
npm run build
```

## Supabase

El frontend consulta estos objetos:

- `game_lexical_groups`
- `lexical_groups`
- `lexical_words`
- `lexical_cloze_questions`
- `discourse_cloze_questions_for_game`
- `discourse_cloze_options_for_game`

El repositorio solo incluye una migracion incremental en [`migrations/20260426_linguistic_layer.sql`](./migrations/20260426_linguistic_layer.sql). La lista completa de objetos requeridos esta documentada en [`docs/supabase.md`](./docs/supabase.md).

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Usa `npm run build` como comando de build.
4. Usa `dist` como output directory.

El archivo [`vercel.json`](./vercel.json) deja esa configuracion fijada dentro del proyecto.

## GitHub

Remoto previsto:

```bash
https://github.com/antoniourutz-dev/hitzkide.git
```

## Scripts utiles

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`
- `npm run clean`
