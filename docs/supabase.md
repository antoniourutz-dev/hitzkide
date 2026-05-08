# Supabase requerido por Hitzkideak

La aplicacion ya esta preparada para conectarse a Supabase desde:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Esquema operativo gestionado en este repositorio

### Sincronizacion de usuario

- `user_profiles`
- `user_progress_snapshots`

### Observabilidad

- `client_observability_events`

### Migraciones incluidas

- [`migrations/20260426_linguistic_layer.sql`](../migrations/20260426_linguistic_layer.sql)
- [`migrations/20260505_operational_foundation.sql`](../migrations/20260505_operational_foundation.sql)

Orden recomendado:

1. Aplicar `20260505_operational_foundation.sql`
2. Aplicar `20260426_linguistic_layer.sql`
3. Aplicar las migraciones del dominio linguistico si se mantienen fuera de este repo

## Objetos de contenido que consume el frontend

### Lexico principal

- `lexical_groups`
- `lexical_words`

La app lee directamente de `lexical_groups` con join a `lexical_words`.

### Cloze

- `lexical_cloze_questions`

Columnas esperadas:

- `id`
- `group_id`
- `source_id`
- `level`
- `difficulty`
- `mode`
- `sentence_eu`
- `answer`
- `options`
- `explanation_eu`
- `explanation_es`
- `nuance_note_eu`
- `nuance_note_es`
- `why_not_eu`
- `why_not_es`
- `register_focus`
- `skill_focus`
- `quality_level`
- `risk_level`
- `is_active`

### Antolatzaileak / discourse cloze

- `discourse_cloze_questions_for_game`
- `discourse_cloze_options_for_game`

Columnas esperadas en `discourse_cloze_questions_for_game`:

- `id`
- `passage_id`
- `target_marker_id`
- `target_function_id`
- `level`
- `difficulty`
- `mode`
- `sentence_eu`
- `sentence_with_blank_eu`
- `answer`
- `normalized_answer`
- `options`
- `discursive_function`
- `correct_answer_reason_eu`
- `correct_answer_reason_es`
- `nuance_note_eu`
- `nuance_note_es`
- `possible_alternatives_eu`
- `possible_alternatives_es`
- `register_note_eu`
- `register_note_es`
- `not_to_use_eu`
- `not_to_use_es`
- `teacher_note`
- `skill_focus`
- `quality_level`
- `risk_level`
- `review_status`
- `is_active`

Columnas esperadas en `discourse_cloze_options_for_game`:

- `id`
- `question_id`
- `option_text`
- `normalized_option`
- `option_order`
- `is_correct`
- `explanation_eu`
- `explanation_es`
- `discursive_relation_eu`
- `discursive_relation_es`
- `why_fits_eu`
- `why_fits_es`
- `why_not_eu`
- `why_not_es`
- `register_note_eu`
- `register_note_es`

## Notas de producto profesional

- El frontend debe poder arrancar sin Supabase, pero la sincronizacion cloud y el sink remoto de observabilidad requieren las tablas operativas anteriores.
- `client_observability_events` esta pensado para usuarios autenticados; los eventos anonimos se conservan localmente hasta que exista sesion.
