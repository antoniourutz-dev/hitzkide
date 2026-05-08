CREATE OR REPLACE FUNCTION public.resolve_lexical_exact_duplicates(
  dry_run boolean DEFAULT true
)
RETURNS TABLE (
  duplicate_set_id bigint,
  normalized_word_set text,
  canonical_group_id bigint,
  duplicate_group_id bigint,
  duplicate_source_id integer,
  duplicate_group_label text,
  action text,
  applied boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_lexical_duplicate_audit();

  IF dry_run THEN
    RETURN QUERY
    SELECT
      ds.id AS duplicate_set_id,
      ds.normalized_word_set,
      ds.canonical_group_id,
      dg.group_id AS duplicate_group_id,
      dg.source_id AS duplicate_source_id,
      dg.group_label AS duplicate_group_label,
      CASE
        WHEN ds.duplicate_type <> 'exact' THEN 'skipped'
        WHEN ds.canonical_group_id IS NULL THEN 'skipped'
        WHEN dg.group_id = ds.canonical_group_id THEN 'kept_canonical'
        WHEN dg.suggested_action = 'disable_duplicate_after_review' THEN 'would_disable_duplicate'
        ELSE 'skipped'
      END AS action,
      false AS applied
    FROM public.lexical_duplicate_sets ds
    JOIN public.lexical_duplicate_groups dg ON dg.duplicate_set_id = ds.id
    WHERE ds.duplicate_type = 'exact'
    ORDER BY ds.id, dg.is_canonical_candidate DESC, dg.canonical_candidate_score DESC, dg.group_id ASC;

    RETURN;
  END IF;

  RETURN QUERY
  WITH audit_rows AS (
    SELECT
      ds.id AS duplicate_set_id,
      ds.normalized_word_set,
      ds.canonical_group_id,
      dg.group_id AS duplicate_group_id,
      dg.source_id AS duplicate_source_id,
      dg.group_label AS duplicate_group_label,
      dg.suggested_action,
      dg.is_canonical_candidate,
      dg.canonical_candidate_score
    FROM public.lexical_duplicate_sets ds
    JOIN public.lexical_duplicate_groups dg ON dg.duplicate_set_id = ds.id
    WHERE ds.duplicate_type = 'exact'
  ),
  candidates AS (
    SELECT *
    FROM audit_rows
    WHERE canonical_group_id IS NOT NULL
      AND duplicate_group_id <> canonical_group_id
      AND suggested_action = 'disable_duplicate_after_review'
  ),
  updated AS (
    UPDATE public.lexical_groups g
    SET
      is_active = false,
      review_status = 'disabled_for_game'
    FROM candidates c
    WHERE g.id = c.duplicate_group_id
    RETURNING c.duplicate_set_id, c.duplicate_group_id
  )
  SELECT
    ar.duplicate_set_id,
    ar.normalized_word_set,
    ar.canonical_group_id,
    ar.duplicate_group_id,
    ar.duplicate_source_id,
    ar.duplicate_group_label,
    CASE
      WHEN ar.canonical_group_id IS NULL THEN 'skipped'
      WHEN ar.duplicate_group_id = ar.canonical_group_id THEN 'kept_canonical'
      WHEN u.duplicate_group_id IS NOT NULL THEN 'disabled_duplicate'
      ELSE 'skipped'
    END AS action,
    (u.duplicate_group_id IS NOT NULL) AS applied
  FROM audit_rows ar
  LEFT JOIN updated u
    ON u.duplicate_set_id = ar.duplicate_set_id
   AND u.duplicate_group_id = ar.duplicate_group_id
  ORDER BY ar.duplicate_set_id, ar.is_canonical_candidate DESC, ar.canonical_candidate_score DESC, ar.duplicate_group_id ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_lexical_exact_duplicates(boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_lexical_exact_duplicates(boolean) FROM authenticated;
