-- Migration SPRINT 2: Linguistic Layer Fields
ALTER TABLE public.lexical_groups
ADD COLUMN IF NOT EXISTS risk_level TEXT,
ADD COLUMN IF NOT EXISTS quality_level TEXT,
ADD COLUMN IF NOT EXISTS explanation_short TEXT,
ADD COLUMN IF NOT EXISTS explanation_long TEXT,
ADD COLUMN IF NOT EXISTS usage_warning TEXT,
ADD COLUMN IF NOT EXISTS good_example TEXT,
ADD COLUMN IF NOT EXISTS bad_example TEXT,
ADD COLUMN IF NOT EXISTS contrast_note TEXT,
ADD COLUMN IF NOT EXISTS teaching_tip TEXT,
-- Sprint 2C: Bilingual support
ADD COLUMN IF NOT EXISTS explanation_short_eu TEXT,
ADD COLUMN IF NOT EXISTS explanation_long_eu TEXT,
ADD COLUMN IF NOT EXISTS usage_warning_eu TEXT,
ADD COLUMN IF NOT EXISTS good_example_eu TEXT,
ADD COLUMN IF NOT EXISTS bad_example_eu TEXT,
ADD COLUMN IF NOT EXISTS contrast_note_eu TEXT,
ADD COLUMN IF NOT EXISTS teaching_tip_eu TEXT;

-- Optional but recommended: Add constraints to ensure data integrity
-- Note: Check if the constraint exists before adding to avoid error
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_risk_level') THEN
        ALTER TABLE public.lexical_groups ADD CONSTRAINT check_risk_level CHECK (risk_level IN ('low', 'medium', 'high'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_quality_level') THEN
        ALTER TABLE public.lexical_groups ADD CONSTRAINT check_quality_level CHECK (quality_level IN ('bronze', 'silver', 'gold', 'platinum'));
    END IF;
END $$;
