-- Permite al superadministrador gestionar reportes (función RPC)
create or replace function public.manage_moderation_report(p_report_id uuid, p_action text, p_note text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare current_status text;
begin
  -- Corrección: Permitir tanto a moderadores como a administradores gestionar reportes
  if not (public.is_moderator() or public.is_admin()) then raise exception 'No tienes permiso para gestionar reportes.'; end if;

  select status into current_status from public.moderation_reports where id = p_report_id for update;
  if not found then raise exception 'No se encontró el reporte.'; end if;

  if p_action = 'review' and current_status in ('open', 'in_review') then
    update public.moderation_reports set status = 'in_review', updated_at = now() where id = p_report_id;
  elsif p_action = 'escalate' and current_status in ('open', 'in_review') then
    update public.moderation_reports set status = 'escalated', updated_at = now() where id = p_report_id;
  elsif p_action = 'resolve' and public.is_admin() then
    update public.moderation_reports set status = 'resolved', resolution_note = nullif(trim(p_note), ''), updated_at = now() where id = p_report_id;
  else
    raise exception 'No puedes realizar esta acción sobre el estado actual del reporte.';
  end if;

  insert into public.moderation_activities (actor_id, target_type, target_id, action, note)
  values (auth.uid(), 'report', p_report_id, p_action, coalesce(nullif(trim(p_note), ''), 'Sin nota adicional.'));
end;
$$;

-- Permite al superadministrador visualizar los reportes (Políticas RLS)
drop policy if exists "Reporters and moderators can read moderation reports" on public.moderation_reports;
create policy "Reporters and moderators can read moderation reports"
on public.moderation_reports for select to authenticated
using (
  (not (select public.is_admin()) and reporter_id = (select auth.uid()))
  or (select public.is_moderator())
  or (select public.is_admin())
);
