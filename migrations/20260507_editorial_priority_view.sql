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
scored AS (
  SELECT
    base.*,
    (
      CASE
        WHEN effective_level ILIKE '%B1%' THEN 25
        WHEN effective_level ILIKE '%B2%' THEN 22
        WHEN effective_level ILIKE '%C1%' THEN 14
        WHEN effective_level ILIKE '%C2%' THEN 8
        WHEN effective_level ILIKE '%Aditua%' THEN 5
        ELSE 0
      END
      + CASE
        WHEN relation IN (
          'erregistro_aldaera',
          'sinonimo_partziala',
          'testuinguruzkoa',
          'gradazioa',
          'sinonimo_testuingurukoa',
          'eremu_semantiko_berekoa'
        ) THEN 20
        ELSE 0
      END
      + CASE recommended_question_type
        WHEN 'context_synonym' THEN 15
        WHEN 'register_question' THEN 18
        WHEN 'intensity_question' THEN 18
        WHEN 'direct_synonym' THEN 5
        ELSE 0
      END
      + CASE
        WHEN category = 'diskurtsoa' THEN 15
        WHEN category IN ('ekintzak', 'komunikazioa', 'pentsamendua', 'gizartea') THEN 8
        ELSE 0
      END
      + CASE
        WHEN word_count >= 4 THEN 10
        WHEN word_count = 3 THEN 7
        WHEN word_count = 2 THEN 4
        ELSE 0
      END
      + CASE WHEN has_explanation_short = false THEN 10 ELSE 0 END
      + CASE WHEN has_good_example = false THEN 8 ELSE 0 END
      + CASE WHEN has_contrast_note = false THEN 8 ELSE 0 END
      + CASE WHEN has_explanation_long = false THEN 4 ELSE 0 END
      + 10
    )::integer AS priority_score
  FROM base
),
banded AS (
  SELECT
    scored.*,
    CASE
      WHEN priority_score >= 75 THEN 'oso_handia'
      WHEN priority_score >= 55 THEN 'handia'
      WHEN priority_score >= 35 THEN 'ertaina'
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
    CASE WHEN recommended_question_type = 'context_synonym' THEN 'Testuinguruko galdera behar du' END,
    CASE WHEN recommended_question_type = 'register_question' THEN 'Erregistroa lantzeko egokia' END,
    CASE WHEN recommended_question_type = 'intensity_question' THEN 'Intentsitatea lantzeko egokia' END,
    CASE WHEN category = 'diskurtsoa' THEN 'Diskurtsoari lotutako taldea' END,
    CASE WHEN word_count >= 3 THEN 'Hitz anitzeko taldea' END,
    CASE WHEN has_explanation_short = false THEN 'Azalpen laburra falta da' END,
    CASE WHEN has_good_example = false THEN 'Adibide naturala falta da' END,
    CASE WHEN has_contrast_note = false THEN 'Kontraste-oharra falta da' END,
    CASE WHEN has_explanation_long = false THEN 'Azalpen luzea falta da' END
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
