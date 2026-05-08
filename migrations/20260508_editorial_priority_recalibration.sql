DROP VIEW IF EXISTS public.lexical_editorial_priority_summary;
DROP VIEW IF EXISTS public.lexical_editorial_priority_queue;

CREATE OR REPLACE VIEW public.lexical_editorial_priority_queue AS
WITH base AS (
  SELECT
    c.*,
    coalesce(c.reviewed_level, c.original_level, 'unknown') AS effective_level
  FROM public.lexical_corpus_coverage c
  WHERE c.is_playable = true
    AND c.quality_level = 'silver'
    AND c.is_active = true
),
raw_scored AS (
  SELECT
    base.*,
    (
      CASE
        WHEN effective_level ILIKE '%B1%' THEN 22
        WHEN effective_level ILIKE '%B2%' THEN 20
        WHEN effective_level ILIKE '%C1%' THEN 12
        WHEN effective_level ILIKE '%C2%' THEN 7
        WHEN effective_level ILIKE '%Aditua%' THEN 5
        ELSE 0
      END
      + CASE relation
        WHEN 'erregistro_aldaera' THEN 18
        WHEN 'sinonimo_partziala' THEN 16
        WHEN 'testuinguruzkoa' THEN 16
        WHEN 'gradazioa' THEN 18
        WHEN 'sinonimo_testuingurukoa' THEN 16
        WHEN 'eremu_semantiko_berekoa' THEN 10
        ELSE 0
      END
      + CASE recommended_question_type
        WHEN 'register_question' THEN 18
        WHEN 'intensity_question' THEN 18
        WHEN 'context_synonym' THEN 15
        WHEN 'direct_synonym' THEN 4
        ELSE 0
      END
      + CASE category
        WHEN 'diskurtsoa' THEN 14
        WHEN 'komunikazioa' THEN 9
        WHEN 'ekintzak' THEN 7
        WHEN 'pentsamendua' THEN 7
        WHEN 'gizartea' THEN 7
        ELSE 0
      END
      + CASE
        WHEN word_count >= 5 THEN 9
        WHEN word_count = 4 THEN 7
        WHEN word_count = 3 THEN 5
        WHEN word_count = 2 THEN 3
        ELSE 0
      END
      + CASE WHEN has_explanation_short = false THEN 5 ELSE 0 END
      + CASE WHEN has_good_example = false THEN 3 ELSE 0 END
      + CASE WHEN has_contrast_note = false THEN 4 ELSE 0 END
      + CASE WHEN has_explanation_long = false THEN 2 ELSE 0 END
      + CASE WHEN quality_level = 'silver' THEN 5 ELSE 0 END
    )::integer AS raw_priority_score
  FROM base
),
scored AS (
  SELECT
    raw_scored.*,
    least(100, raw_priority_score)::integer AS priority_score
  FROM raw_scored
),
banded AS (
  SELECT
    scored.*,
    CASE
      WHEN priority_score >= 85 THEN 'oso_handia'
      WHEN priority_score >= 70 THEN 'handia'
      WHEN priority_score >= 50 THEN 'ertaina'
      ELSE 'baxua'
    END AS priority_band
  FROM scored
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
  has_explanation_short,
  has_explanation_long,
  has_good_example,
  has_contrast_note,
  is_playable,
  coverage_status,
  priority_score,
  priority_band,
  array_remove(ARRAY[
    CASE WHEN effective_level ILIKE '%B1%' OR effective_level ILIKE '%B2%' THEN 'B1/B2 mailako taldea' END,
    CASE WHEN relation IN (
      'erregistro_aldaera',
      'sinonimo_partziala',
      'testuinguruzkoa',
      'gradazioa',
      'sinonimo_testuingurukoa',
      'eremu_semantiko_berekoa'
    ) THEN 'Ñabardura edo testuinguru handiko sinonimia' END,
    CASE WHEN recommended_question_type = 'register_question' THEN 'Erregistroa lantzeko egokia' END,
    CASE WHEN recommended_question_type = 'intensity_question' OR relation = 'gradazioa' THEN 'Intentsitatea edo gradazioa lantzeko egokia' END,
    CASE WHEN category = 'diskurtsoa' THEN 'Diskurtsoari lotutako taldea' END,
    CASE WHEN word_count >= 3 THEN 'Hitz anitzeko taldea' END,
    CASE WHEN has_explanation_short = false THEN 'Azalpen laburra falta da' END,
    CASE WHEN has_good_example = false THEN 'Adibide naturala falta da' END,
    CASE WHEN has_contrast_note = false THEN 'Kontraste-oharra falta da' END
  ], NULL)::text[] AS priority_reasons,
  CASE
    WHEN has_explanation_short = false AND has_contrast_note = false THEN 'Sortu azalpen laburra eta kontraste-oharra.'
    WHEN has_explanation_short = false THEN 'Sortu azalpen laburra.'
    WHEN has_good_example = false THEN 'Gehitu adibide natural eta segurua.'
    WHEN has_contrast_note = false THEN 'Gehitu ñabardura edo kontraste-oharra.'
    ELSE 'Berrikusi eta igo gold mailara, egokia bada.'
  END AS editorial_next_action
FROM banded
ORDER BY priority_score DESC, reviewed_level NULLS LAST, id ASC;

CREATE OR REPLACE VIEW public.lexical_editorial_priority_summary AS
SELECT
  count(*)::integer AS total_priority_items,
  count(*) FILTER (WHERE priority_band = 'oso_handia')::integer AS very_high_priority_count,
  count(*) FILTER (WHERE priority_band = 'handia')::integer AS high_priority_count,
  count(*) FILTER (WHERE priority_band = 'ertaina')::integer AS medium_priority_count,
  count(*) FILTER (WHERE priority_band = 'baxua')::integer AS low_priority_count,
  count(*) FILTER (WHERE has_explanation_short = false)::integer AS missing_explanation_in_priority_count,
  count(*) FILTER (WHERE has_good_example = false)::integer AS missing_example_in_priority_count,
  count(*) FILTER (WHERE has_contrast_note = false)::integer AS missing_contrast_in_priority_count,
  round(coalesce(avg(priority_score), 0), 1) AS average_priority_score
FROM public.lexical_editorial_priority_queue;

GRANT SELECT ON public.lexical_editorial_priority_queue TO authenticated;
GRANT SELECT ON public.lexical_editorial_priority_summary TO authenticated;
