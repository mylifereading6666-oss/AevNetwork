-- Replace numeric team invite codes with friend-to-team invitations.
-- Existing teams, members, friend relationships and chat history are preserved.

CREATE TABLE IF NOT EXISTS public.aevnetwork_team_friend_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.aevnetwork_teams(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT aevnetwork_team_friend_invitations_no_self CHECK (inviter_id <> invitee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS aevnetwork_team_friend_invites_pending_unique
  ON public.aevnetwork_team_friend_invitations(team_id, invitee_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS aevnetwork_team_friend_invites_incoming_idx
  ON public.aevnetwork_team_friend_invitations(invitee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS aevnetwork_team_friend_invites_outgoing_idx
  ON public.aevnetwork_team_friend_invitations(inviter_id, status, created_at DESC);

ALTER TABLE public.aevnetwork_team_friend_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aevnetwork_team_friend_invitations FROM anon, authenticated, public;
GRANT ALL ON public.aevnetwork_team_friend_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.aevnetwork_send_team_friend_invite(
  p_team_id uuid, p_inviter_id uuid, p_invitee_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team public.aevnetwork_teams%rowtype;
  v_count integer;
  v_existing public.aevnetwork_team_friend_invitations%rowtype;
  v_id uuid;
BEGIN
  IF p_team_id IS NULL OR p_inviter_id IS NULL OR p_invitee_id IS NULL OR p_inviter_id = p_invitee_id THEN
    RAISE EXCEPTION 'invalid_team_invite';
  END IF;
  SELECT * INTO v_team FROM public.aevnetwork_teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'team_not_found'; END IF;
  IF v_team.owner_id <> p_inviter_id THEN RAISE EXCEPTION 'team_leader_required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.aevnetwork_friendships f
    WHERE (f.user_low = LEAST(p_inviter_id,p_invitee_id) AND f.user_high = GREATEST(p_inviter_id,p_invitee_id))
  ) THEN RAISE EXCEPTION 'team_invite_target_not_friend'; END IF;
  IF EXISTS (SELECT 1 FROM public.aevnetwork_team_members m
    WHERE m.team_id = p_team_id AND m.user_id = p_invitee_id AND m.status IN ('approved','pending')) THEN
    RAISE EXCEPTION 'team_invite_already_member_or_applied';
  END IF;
  SELECT count(*) INTO v_count FROM public.aevnetwork_team_members
    WHERE team_id = p_team_id AND status = 'approved';
  IF v_count >= 4 THEN RAISE EXCEPTION 'team_full'; END IF;

  SELECT * INTO v_existing FROM public.aevnetwork_team_friend_invitations
    WHERE team_id = p_team_id AND invitee_id = p_invitee_id AND status = 'rejected'
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    UPDATE public.aevnetwork_team_friend_invitations
      SET status='pending', inviter_id=p_inviter_id, created_at=now(), responded_at=NULL
      WHERE id=v_existing.id RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.aevnetwork_team_friend_invitations(team_id,inviter_id,invitee_id)
    VALUES(p_team_id,p_inviter_id,p_invitee_id) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aevnetwork_respond_team_friend_invite(
  p_invitation_id uuid, p_user_id uuid, p_decision text
) RETURNS TABLE(team_id uuid, team_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.aevnetwork_team_friend_invitations%rowtype;
  v_team public.aevnetwork_teams%rowtype;
  v_count integer;
  v_member public.aevnetwork_team_members%rowtype;
  v_has_member boolean := false;
BEGIN
  IF p_decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'invalid_team_invite_decision'; END IF;
  SELECT * INTO v_invite FROM public.aevnetwork_team_friend_invitations
    WHERE id=p_invitation_id FOR UPDATE;
  IF NOT FOUND OR v_invite.invitee_id <> p_user_id THEN RAISE EXCEPTION 'team_invite_not_found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'team_invite_already_responded'; END IF;

  SELECT * INTO v_team FROM public.aevnetwork_teams WHERE id=v_invite.team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'team_not_found'; END IF;

  IF p_decision='rejected' THEN
    UPDATE public.aevnetwork_team_friend_invitations SET status='rejected', responded_at=now() WHERE id=v_invite.id;
    RETURN QUERY SELECT v_team.id, v_team.name;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.aevnetwork_friendships f
    WHERE f.user_low=LEAST(v_invite.inviter_id,p_user_id)
      AND f.user_high=GREATEST(v_invite.inviter_id,p_user_id)
  ) THEN RAISE EXCEPTION 'team_invite_friendship_removed'; END IF;

  SELECT * INTO v_member FROM public.aevnetwork_team_members
    WHERE team_id=v_team.id AND user_id=p_user_id LIMIT 1 FOR UPDATE;
  v_has_member := FOUND;
  IF v_has_member AND v_member.status='approved' THEN RAISE EXCEPTION 'already_team_member'; END IF;
  SELECT count(*) INTO v_count FROM public.aevnetwork_team_members
    WHERE team_id=v_team.id AND status='approved';
  IF v_count >= 4 THEN RAISE EXCEPTION 'team_full'; END IF;

  IF v_has_member THEN
    UPDATE public.aevnetwork_team_members SET status='approved', role='member',
      reviewed_at=now(), created_at=now() WHERE id=v_member.id;
  ELSE
    INSERT INTO public.aevnetwork_team_members(team_id,user_id,role,status,reviewed_at)
      VALUES(v_team.id,p_user_id,'member','approved',now());
  END IF;
  UPDATE public.aevnetwork_team_friend_invitations SET status='accepted', responded_at=now() WHERE id=v_invite.id;
  RETURN QUERY SELECT v_team.id, v_team.name;
END;
$$;

REVOKE ALL ON FUNCTION public.aevnetwork_send_team_friend_invite(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aevnetwork_respond_team_friend_invite(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aevnetwork_send_team_friend_invite(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.aevnetwork_respond_team_friend_invite(uuid,uuid,text) TO service_role;

-- Disable the retired numeric-code RPCs; legacy columns are retained for non-destructive compatibility.
DROP FUNCTION IF EXISTS public.aevnetwork_save_team_invite(uuid,text,timestamptz);
DROP FUNCTION IF EXISTS public.aevnetwork_redeem_team_invite(text,uuid);
