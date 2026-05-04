# Supabase requerido por Hitzkideak

La aplicacion ya esta preparada para conectarse a Supabase desde variables de entorno de Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Objetos que consume el frontend

### Lexico principal

- `lexical_groups`
- `lexical_words`
- `game_lexical_groups`

La app intenta leer primero la vista `game_lexical_groups`. Si no existe, hace fallback a `lexical_groups` con `lexical_words`.

### Cloze

- `lexical_cloze_questions`

Columnas esperadas por el frontend:

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

## Migraciones incluidas

Actualmente el repositorio solo incluye:

- [`migrations/20260426_linguistic_layer.sql`](../migrations/20260426_linguistic_layer.sql)

Esa migracion amplia `lexical_groups`, pero no crea todo el esquema desde cero. Si el proyecto de Supabase ya existe, revisa que los objetos anteriores esten disponibles antes de desplegar.
