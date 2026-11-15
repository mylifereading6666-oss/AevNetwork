-- One active team per owner. Deleting the team releases the owner to create another.
-- Existing duplicate owners are reported before the index is created; no data is deleted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.aevnetwork_teams
    GROUP BY owner_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_team_owners_found: resolve existing duplicate teams before applying this migration';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS aevnetwork_teams_one_per_owner_idx
  ON public.aevnetwork_teams (owner_id);
