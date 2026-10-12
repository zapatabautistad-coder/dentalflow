-- 033 · El paciente de un registro no se puede cambiar.
--
-- Auditoría de seguridad (2026-10-12): al editar, set_clinic_id() (029) devolvía la fila
-- sin revisar patient_id si no cambiaban doctor_id ni appointment_id. Admin y recepción
-- podían cambiar appointments.patient_id o patient_medical_history.patient_id por el de un
-- paciente de OTRA clínica (conociendo su UUID): la fila seguía con el clinic_id propio y la
-- RLS restrictiva la aceptaba. No filtraba datos, pero rompía la integridad, y en el historial
-- (clave = patient_id) podía bloquear el historial de ese paciente en su clínica.
-- Cargos, pagos, recetas, plan y sala de espera ya lo bloqueaban en su propio trigger.
--
-- Cambio: en UPDATE, si la tabla tiene patient_id y cambia, se rechaza. El resto de la
-- función queda igual. La app nunca cambia el paciente de un registro.

create or replace function public.set_clinic_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_clinic uuid;
  v_doctor uuid;
begin
  if tg_op = 'UPDATE' then
    if new.clinic_id is distinct from old.clinic_id then
      raise exception 'La clínica de un registro no se puede cambiar.';
    end if;
    if (v_row ? 'patient_id')
       and (v_row ->> 'patient_id') is distinct from (to_jsonb(old) ->> 'patient_id') then
      raise exception 'El paciente de un registro no se puede cambiar.';
    end if;
    -- Si cambia el doctor o la cita, se validan abajo igual que al crear.
    if (v_row ->> 'doctor_id') is not distinct from (to_jsonb(old) ->> 'doctor_id')
       and (v_row ->> 'appointment_id') is not distinct from (to_jsonb(old) ->> 'appointment_id') then
      return new;
    end if;
    v_clinic := old.clinic_id;
  elsif tg_table_name = 'prescription_items' then
    select r.clinic_id into v_clinic
      from public.prescriptions r where r.id = (v_row ->> 'prescription_id')::uuid;
  elsif tg_table_name = 'profiles' then
    v_clinic := new.clinic_id;  -- solo ensure_profile_for_user crea perfiles
  elsif v_row ? 'patient_id' then
    select p.clinic_id into v_clinic
      from public.patients p where p.id = (v_row ->> 'patient_id')::uuid;
  else
    v_clinic := public.get_my_clinic();
  end if;

  if v_clinic is null then
    raise exception 'No se pudo determinar la clínica del registro.';
  end if;

  v_doctor := nullif(v_row ->> 'doctor_id', '')::uuid;
  if v_doctor is not null and not exists (
    select 1 from public.profiles d where d.id = v_doctor and d.clinic_id = v_clinic
  ) then
    raise exception 'El doctor no pertenece a esta clínica.';
  end if;

  -- Una cita enlazada debe ser del mismo paciente (y por tanto de la misma clínica).
  if tg_table_name <> 'appointments' and nullif(v_row ->> 'appointment_id', '') is not null
     and not exists (
       select 1 from public.appointments a
        where a.id = (v_row ->> 'appointment_id')::uuid
          and a.patient_id = (v_row ->> 'patient_id')::uuid
     ) then
    raise exception 'La cita no es de este paciente.';
  end if;

  new.clinic_id = v_clinic;
  return new;
end;
$$;
