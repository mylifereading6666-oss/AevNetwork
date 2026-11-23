-- Fix ambiguous team_id references in the team friend invitation response RPC.
-- The RETURNS TABLE output column team_id is also a PL/pgSQL variable,
-- so every table column reference with that name must be qualified.
-- Existing teams, memberships, invitations and chat history are preserved.
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
  IF p_decision NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'invalid_team_invite_decision';
  END IF;

  SELECT i.* INTO v_invite
  FROM public.aevnetwork_team_friend_invitations AS i
  WHERE i.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR v_invite.invitee_id <> p_user_id THEN
    RAISE EXCEPTION 'team_invite_not_found';
  END IF;
  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'team_invite_already_responded';
  END IF;

  SELECT t.* INTO v_team
  FROM public.aevnetwork_teams AS t
  WHERE t.id = v_invite.team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.aevnetwork_team_friend_invitations AS i
    SET status = 'rejected', responded_at = now()
    WHERE i.id = v_invite.id;
    RETURN QUERY SELECT v_team.id, v_team.name::text;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.aevnetwork_friendships AS f
    WHERE f.user_low = LEAST(v_invite.inviter_id, p_user_id)
      AND f.user_high = GREATEST(v_invite.inviter_id, p_user_id)
  ) THEN
    RAISE EXCEPTION 'team_invite_friendship_removed';
  END IF;

  SELECT tm.* INTO v_member
  FROM public.aevnetwork_team_members AS tm
  WHERE tm.team_id = v_team.id AND tm.user_id = p_user_id
  LIMIT 1
  FOR UPDATE;
  v_has_member := FOUND;

  IF v_has_member AND v_member.status = 'approved' THEN
    RAISE EXCEPTION 'already_team_member';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.aevnetwork_team_members AS tm
  WHERE tm.team_id = v_team.id AND tm.status = 'approved';
  IF v_count >= 4 THEN
    RAISE EXCEPTION 'team_full';
  END IF;

  IF v_has_member THEN
    UPDATE public.aevnetwork_team_members AS tm
    SET status = 'approved',
        role = 'member',
        reviewed_at = now(),
        created_at = now()
    WHERE tm.id = v_member.id;
  ELSE
    INSERT INTO public.aevnetwork_team_members
      (team_id, user_id, role, status, reviewed_at)
    VALUES
      (v_team.id, p_user_id, 'member', 'approved', now());
  END IF;

  UPDATE public.aevnetwork_team_friend_invitations AS i
  SET status = 'accepted', responded_at = now()
  WHERE i.id = v_invite.id;

  RETURN QUERY SELECT v_team.id, v_team.name::text;
END;
$$;

REVOKE ALL ON FUNCTION public.aevnetwork_respond_team_friend_invite(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aevnetwork_respond_team_friend_invite(uuid,uuid,text) TO service_role;
