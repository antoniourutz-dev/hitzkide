DROP VIEW IF EXISTS public.discourse_corpus_coverage_summary;
DROP VIEW IF EXISTS public.discourse_corpus_coverage;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_by_risk;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_by_quality;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_by_question_type;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_by_category;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_by_level;
DROP VIEW IF EXISTS public.lexical_corpus_coverage_summary;
DROP VIEW IF EXISTS public.lexical_corpus_coverage;

CREATE OR REPLACE VIEW public.lexical_corpus_coverage AS
WITH grouped_words AS (
  SELECT
    g.id,
    string_agg(w.word, ' / ' ORDER BY w.id) AS group_label,
    count(w.id)::integer AS word_count,
    bool_or(w.status = 'kontuz') AS has_sensitive_word
  FROM public.lexical_groups g
  LEFT JOIN public.lexical_words w ON w.group_id = g.id
  GROUP BY g.id
),
coverage AS (
  SELECT
    g.id,
    g.source_id,
    gw.group_label,
    g.concept,
    g.category,
    g.subcategory,
    g.grammar,
    g.relation,
    g.original_level,
    g.reviewed_level,
    g.recommended_question_type,
    g.review_status,
    g.risk_level,
    g.quality_level,
    g.is_active,
    coalesce(gw.word_count, 0) AS word_count,
    coalesce(gw.has_sensitive_word, false) AS has_sensitive_word,
    (nullif(btrim(coalesce(g.explanation_short_eu, g.explanation_short, '')), '') IS NOT NULL) AS has_explanation_short,
    (nullif(btrim(coalesce(g.explanation_long_eu, g.explanation_long, '')), '') IS NOT NULL) AS has_explanation_long,
    (nullif(btrim(coalesce(g.good_example_eu, g.good_example, '')), '') IS NOT NULL) AS has_good_example,
    (nullif(btrim(coalesce(g.contrast_note_eu, g.contrast_note, '')), '') IS NOT NULL) AS has_contrast_note
  FROM public.lexical_groups g
  LEFT JOIN grouped_words gw ON gw.id = g.id
),
statused AS (
  SELECT
    coverage.*,
    (
      coalesce(is_active, false) = true
      AND review_status IN ('reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive')
      AND (risk_level IS NULL OR risk_level IN ('low', 'medium'))
      AND quality_level IN ('silver', 'gold', 'platinum')
      AND recommended_question_type IN ('direct_synonym', 'context_synonym', 'register_question', 'intensity_question')
      AND word_count >= 2
    ) AS playable_rule,
    CASE
      WHEN coalesce(is_active, false) = false THEN 'inactive'
      WHEN review_status = 'disabled_for_game' THEN 'disabled_for_game'
      WHEN review_status = 'needs_external_check' THEN 'needs_external_check'
      WHEN review_status IS NULL OR review_status NOT IN ('reviewed_safe', 'reviewed_context_needed', 'reviewed_register_sensitive') THEN 'needs_external_check'
      WHEN risk_level = 'high' THEN 'high_risk'
      WHEN quality_level IS NULL THEN 'missing_quality_level'
      WHEN quality_level = 'bronze' THEN 'low_quality'
      WHEN recommended_question_type IS NULL THEN 'missing_question_type'
      WHEN recommended_question_type NOT IN ('direct_synonym', 'context_synonym', 'register_question', 'intensity_question') THEN 'unknown_question_type'
      WHEN word_count < 2 THEN 'not_enough_words'
      ELSE 'playable'
    END AS coverage_status
  FROM coverage
)
SELECT
  id,
  source_id,
  group_label,
  concept,
  category,
  subcategory,
  grammar,
  relation,
  original_level,
  reviewed_level,
  recommended_question_type,
  review_status,
  risk_level,
  quality_level,
  is_active,
  word_count,
  has_sensitive_word,
  has_explanation_short,
  has_explanation_long,
  has_good_example,
  has_contrast_note,
  coverage_status,
  playable_rule AS is_playable,
  CASE coverage_status
    WHEN 'playable' THEN 'Jokoan erabiltzeko prest.'
    WHEN 'inactive' THEN 'Ez dago aktibo. Erabaki berriro aktibatu edo artxibatu.'
    WHEN 'disabled_for_game' THEN 'Jokotik kanpo mantendu, edo berrikusi testuinguru aurreratuan erabiltzeko.'
    WHEN 'needs_external_check' THEN 'Egiaztatu Euskaltzaindia, OEH edo corpus bidez aktibatu aurretik.'
    WHEN 'high_risk' THEN 'Arrisku handikoa da. Ez erabili joko arruntean.'
    WHEN 'low_quality' THEN 'Osatu azalpena, adibidea eta kontraste-oharra.'
    WHEN 'missing_quality_level' THEN 'Esleitu kalitate-maila: silver, gold edo platinum.'
    WHEN 'missing_question_type' THEN 'Esleitu galdera mota kanoniko bat.'
    WHEN 'unknown_question_type' THEN 'Normalizatu recommended_question_type balioa.'
    WHEN 'not_enough_words' THEN 'Gehitu gutxienez bi hitz baliodun edo desaktibatu taldea.'
    ELSE NULL
  END AS recommended_action
FROM statused;

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_summary AS
SELECT
  count(*)::integer AS total_groups,
  count(*) FILTER (WHERE is_active = true)::integer AS active_groups,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_groups,
  count(*) FILTER (WHERE is_playable = false)::integer AS non_playable_groups,
  round((count(*) FILTER (WHERE is_playable = true)::numeric / nullif(count(*), 0)::numeric) * 100, 1) AS playable_percentage,
  count(*) FILTER (WHERE coverage_status = 'disabled_for_game')::integer AS disabled_for_game_count,
  count(*) FILTER (WHERE coverage_status = 'needs_external_check')::integer AS needs_external_check_count,
  count(*) FILTER (WHERE coverage_status = 'high_risk')::integer AS high_risk_count,
  count(*) FILTER (WHERE coverage_status = 'low_quality')::integer AS low_quality_count,
  count(*) FILTER (WHERE coverage_status = 'missing_quality_level')::integer AS missing_quality_level_count,
  count(*) FILTER (WHERE coverage_status = 'missing_question_type')::integer AS missing_question_type_count,
  count(*) FILTER (WHERE coverage_status = 'unknown_question_type')::integer AS unknown_question_type_count,
  count(*) FILTER (WHERE coverage_status = 'not_enough_words')::integer AS not_enough_words_count,
  count(*) FILTER (WHERE has_explanation_short = false OR has_contrast_note = false)::integer AS missing_explanation_count,
  count(*) FILTER (WHERE has_good_example = false)::integer AS missing_examples_count,
  count(*) FILTER (WHERE quality_level = 'platinum')::integer AS platinum_count,
  count(*) FILTER (WHERE quality_level = 'gold')::integer AS gold_count,
  count(*) FILTER (WHERE quality_level = 'silver')::integer AS silver_count,
  count(*) FILTER (WHERE quality_level = 'bronze')::integer AS bronze_count,
  count(*) FILTER (WHERE quality_level = 'silver' AND is_playable = true)::integer AS playable_basic_count,
  count(*) FILTER (WHERE quality_level IN ('gold', 'platinum') AND is_playable = true)::integer AS playable_premium_count
FROM public.lexical_corpus_coverage;

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_by_level AS
SELECT
  coalesce(reviewed_level, original_level, 'unknown') AS level,
  count(*)::integer AS total_count,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_count,
  count(*) FILTER (WHERE is_playable = false)::integer AS non_playable_count,
  round((count(*) FILTER (WHERE is_playable = true)::numeric / nullif(count(*), 0)::numeric) * 100, 1) AS playable_percentage
FROM public.lexical_corpus_coverage
GROUP BY coalesce(reviewed_level, original_level, 'unknown');

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_by_category AS
SELECT
  coalesce(category, 'unknown') AS category,
  count(*)::integer AS total_count,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_count,
  count(*) FILTER (WHERE is_playable = false)::integer AS non_playable_count,
  round((count(*) FILTER (WHERE is_playable = true)::numeric / nullif(count(*), 0)::numeric) * 100, 1) AS playable_percentage
FROM public.lexical_corpus_coverage
GROUP BY coalesce(category, 'unknown');

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_by_question_type AS
SELECT
  coalesce(recommended_question_type, 'unknown') AS recommended_question_type,
  count(*)::integer AS total_count,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_count,
  count(*) FILTER (WHERE is_playable = false)::integer AS non_playable_count,
  round((count(*) FILTER (WHERE is_playable = true)::numeric / nullif(count(*), 0)::numeric) * 100, 1) AS playable_percentage
FROM public.lexical_corpus_coverage
GROUP BY coalesce(recommended_question_type, 'unknown');

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_by_quality AS
SELECT
  coalesce(quality_level, 'unknown') AS quality_level,
  count(*)::integer AS total_count,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_count
FROM public.lexical_corpus_coverage
GROUP BY coalesce(quality_level, 'unknown');

CREATE OR REPLACE VIEW public.lexical_corpus_coverage_by_risk AS
SELECT
  coalesce(risk_level, 'unknown') AS risk_level,
  count(*)::integer AS total_count,
  count(*) FILTER (WHERE is_playable = true)::integer AS playable_count
FROM public.lexical_corpus_coverage
GROUP BY coalesce(risk_level, 'unknown');

GRANT SELECT ON public.lexical_corpus_coverage TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_summary TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_by_level TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_by_category TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_by_question_type TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_by_quality TO authenticated;
GRANT SELECT ON public.lexical_corpus_coverage_by_risk TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.discourse_cloze_questions_for_game') IS NOT NULL
     AND to_regclass('public.discourse_cloze_options_for_game') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.discourse_corpus_coverage AS
      WITH option_stats AS (
        SELECT
          question_id,
          count(*)::integer AS option_count,
          count(*) FILTER (WHERE is_correct = true)::integer AS correct_option_count,
          bool_and(nullif(btrim(coalesce(explanation_eu, '')), '') IS NOT NULL) AS all_options_have_explanation_eu,
          bool_or(
            concat_ws(' ', explanation_es, discursive_relation_es, why_fits_es, why_not_es, register_note_es)
              ~* '\m(is|the|because|previous|consequence|contrast|example|sequence|appropriate|should|could|marks|expresses|text|sentence)\M'
          ) AS possible_english_in_option_es_fields
        FROM public.discourse_cloze_options_for_game
        GROUP BY question_id
      ),
      coverage AS (
        SELECT
          q.id AS question_id,
          q.passage_id,
          q.answer,
          q.normalized_answer,
          q.level,
          q.difficulty,
          q.discursive_function,
          q.skill_focus,
          q.quality_level,
          q.risk_level,
          q.review_status,
          q.is_active,
          coalesce(os.option_count, 0) AS option_count,
          coalesce(os.correct_option_count, 0) AS correct_option_count,
          (nullif(btrim(coalesce(q.correct_answer_reason_eu, '')), '') IS NOT NULL) AS has_question_explanation_eu,
          coalesce(os.all_options_have_explanation_eu, false) AS all_options_have_explanation_eu,
          (
            concat_ws(
              ' ',
              q.correct_answer_reason_es,
              q.nuance_note_es,
              q.possible_alternatives_es,
              q.register_note_es,
              q.not_to_use_es
            ) ~* '\m(is|the|because|previous|consequence|contrast|example|sequence|appropriate|should|could|marks|expresses|text|sentence)\M'
            OR coalesce(os.possible_english_in_option_es_fields, false)
          ) AS possible_english_in_es_fields
        FROM public.discourse_cloze_questions_for_game q
        LEFT JOIN option_stats os ON os.question_id = q.id
      ),
      statused AS (
        SELECT
          coverage.*,
          CASE
            WHEN coalesce(is_active, false) = false THEN 'inactive'
            WHEN review_status <> 'reviewed_safe' OR review_status IS NULL THEN 'not_reviewed_safe'
            WHEN risk_level = 'high' THEN 'high_risk'
            WHEN quality_level NOT IN ('gold', 'platinum') OR quality_level IS NULL THEN 'low_quality'
            WHEN option_count <> 4 THEN 'wrong_option_count'
            WHEN correct_option_count <> 1 THEN 'wrong_correct_option_count'
            WHEN NOT has_question_explanation_eu THEN 'missing_question_explanation_eu'
            WHEN NOT all_options_have_explanation_eu THEN 'missing_option_explanation_eu'
            WHEN possible_english_in_es_fields THEN 'possible_english_in_es_fields'
            ELSE 'playable'
          END AS coverage_status
        FROM coverage
      )
      SELECT
        statused.*,
        (coverage_status = 'playable') AS is_playable,
        CASE coverage_status
          WHEN 'playable' THEN 'Jokoan erabiltzeko prest.'
          WHEN 'inactive' THEN 'Ez dago aktibo. Erabaki berriro aktibatu edo artxibatu.'
          WHEN 'not_reviewed_safe' THEN 'Berrikusi eta normalizatu reviewed_safe izan aurretik.'
          WHEN 'high_risk' THEN 'Arrisku handikoa da. Ez erabili joko arruntean.'
          WHEN 'low_quality' THEN 'Igo kalitatea gold edo platinum mailara.'
          WHEN 'wrong_option_count' THEN 'Doitu aukerak: galderak lau aukera behar ditu.'
          WHEN 'wrong_correct_option_count' THEN 'Doitu aukerak: aukera zuzen bakarra behar du.'
          WHEN 'missing_question_explanation_eu' THEN 'Gehitu erantzun zuzenaren azalpena euskaraz.'
          WHEN 'missing_option_explanation_eu' THEN 'Gehitu aukera guztien azalpena euskaraz.'
          WHEN 'possible_english_in_es_fields' THEN 'Berrikusi gaztelaniazko eremuak: baliteke ingelesa egotea.'
          ELSE NULL
        END AS recommended_action
      FROM statused
    $view$;

    EXECUTE 'GRANT SELECT ON public.discourse_corpus_coverage TO authenticated';

    EXECUTE $view$
      CREATE OR REPLACE VIEW public.discourse_corpus_coverage_summary AS
      SELECT
        count(*)::integer AS total_questions,
        count(*) FILTER (WHERE is_active = true)::integer AS active_questions,
        count(*) FILTER (WHERE is_playable = true)::integer AS playable_questions,
        count(*) FILTER (WHERE option_count = 4)::integer AS four_option_questions,
        count(*) FILTER (WHERE correct_option_count = 1)::integer AS single_correct_option_questions,
        count(*) FILTER (WHERE has_question_explanation_eu = false OR all_options_have_explanation_eu = false)::integer AS missing_explanation_count,
        count(*) FILTER (WHERE possible_english_in_es_fields = true)::integer AS possible_english_in_es_fields_count
      FROM public.discourse_corpus_coverage
    $view$;

    EXECUTE 'GRANT SELECT ON public.discourse_corpus_coverage_summary TO authenticated';
  END IF;
END $$;
