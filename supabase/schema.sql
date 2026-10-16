-- Generado con `npm run db:schema` desde las migraciones. No editar a mano.
-- Solo referencia: lo que se aplica en producción son las migraciones.
CREATE SCHEMA IF NOT EXISTS "public";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE TYPE "public"."ai_consent_scope" AS ENUM (
    'dictado',
    'procesamiento_ia'
);
CREATE TYPE "public"."ai_draft_kind" AS ENUM (
    'odontograma',
    'nota',
    'signos',
    'plan',
    'pregunta'
);
CREATE TYPE "public"."ai_draft_status" AS ENUM (
    'propuesto',
    'aceptado',
    'rechazado'
);
CREATE TYPE "public"."appointment_status" AS ENUM (
    'programada',
    'confirmada',
    'en_curso',
    'completada',
    'cancelada',
    'no_asistio'
);
CREATE TYPE "public"."ars_claim_status" AS ENUM (
    'no_aplica',
    'pendiente',
    'reclamado',
    'pagado',
    'rechazado'
);
CREATE TYPE "public"."clinical_entry_kind" AS ENUM (
    'nota',
    'medicamento',
    'procedimiento'
);
CREATE TYPE "public"."encounter_status" AS ENUM (
    'abierta',
    'cerrada'
);
CREATE TYPE "public"."insurance_type" AS ENUM (
    'ars',
    'privado'
);
CREATE TYPE "public"."odontogram_condition" AS ENUM (
    'sano',
    'caries',
    'obturacion',
    'sellante',
    'corona',
    'endodoncia',
    'fractura',
    'extraccion_indicada',
    'ausente',
    'implante'
);
CREATE TYPE "public"."payment_method" AS ENUM (
    'efectivo',
    'tarjeta',
    'transferencia',
    'cheque'
);
CREATE TYPE "public"."queue_status" AS ENUM (
    'en_espera',
    'llamado',
    'en_atencion',
    'atendido',
    'cancelado'
);
CREATE TYPE "public"."record_source" AS ENUM (
    'manual',
    'ia_confirmada'
);
CREATE TYPE "public"."treatment_status" AS ENUM (
    'pendiente',
    'en_proceso',
    'completado',
    'cancelado'
);
CREATE TYPE "public"."user_role" AS ENUM (
    'doctor',
    'recepcion',
    'admin',
    'enfermeria'
);
CREATE OR REPLACE FUNCTION "public"."ai_consent_active"("p_patient" "uuid", "p_scope" "public"."ai_consent_scope") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce((
    select c.granted from public.ai_consents c
     where c.patient_id = p_patient and c.scope = p_scope
     order by c.recorded_at desc, c.id desc
     limit 1), false);
$$;
CREATE OR REPLACE FUNCTION "public"."appointment_range"("p_starts_at" timestamp with time zone, "p_duration_minutes" integer) RETURNS "tstzrange"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    SET "search_path" TO ''
    AS $$
  select pg_catalog.tstzrange(
    p_starts_at,
    p_starts_at + pg_catalog.make_interval(mins => p_duration_minutes),
    '[)'
  )
$$;
CREATE OR REPLACE FUNCTION "public"."assign_queue_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.queue_date is null then
    raise exception 'El turno necesita una fecha (queue_date).';
  end if;
  perform pg_advisory_xact_lock(
    hashtext('public.queue.position'),
    hashtext(new.clinic_id::text || new.queue_date::text)
  );
  select coalesce(max(q.position), 0) + 1
    into new.position
    from public.queue q
   where q.clinic_id = new.clinic_id
     and q.queue_date = new.queue_date;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."assign_receipt_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  new.receipt_number = public.next_clinic_number(new.clinic_id, 'receipt');
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."assign_record_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' then
    -- Sin identity, el expediente sería editable: se bloquea aquí.
    if new.record_number is distinct from old.record_number then
      raise exception 'El número de expediente no se cambia.';
    end if;
    return new;
  end if;
  new.record_number = public.next_clinic_number(new.clinic_id, 'record');
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."audit_row"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then
    return null;
  end if;
  insert into public.audit_log
    (table_name, record_id, patient_id, clinic_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    (case when tg_table_name = 'patient_medical_history' then v_row ->> 'patient_id' else v_row ->> 'id' end)::uuid,
    (case when tg_table_name = 'patients' then v_row ->> 'id' else v_row ->> 'patient_id' end)::uuid,
    (case when tg_table_name = 'clinics' then v_row ->> 'id' else v_row ->> 'clinic_id' end)::uuid,
    tg_op,
    auth.uid(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."block_truncate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'TRUNCATE no está permitido en %: los registros no se borran.', tg_table_name;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."check_encounter_link"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_patient uuid;
  v_status public.encounter_status;
begin
  if tg_op = 'UPDATE' then
    if new.encounter_id is distinct from old.encounter_id then
      raise exception 'La consulta de un registro no se puede cambiar.';
    end if;
    return new;
  end if;
  if new.encounter_id is null then
    return new;
  end if;
  select e.patient_id, e.status into v_patient, v_status
    from public.encounters e where e.id = new.encounter_id;
  if v_patient is distinct from new.patient_id then
    raise exception 'La consulta no es de este paciente.';
  end if;
  if v_status <> 'abierta' then
    raise exception 'La consulta está cerrada: no admite registros nuevos.';
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."create_prescription"("p_patient_id" "uuid", "p_items" "jsonb", "p_indications" "text" DEFAULT NULL::"text", "p_appointment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_id uuid;
  v_item jsonb;
  v_position smallint := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La receta necesita al menos un medicamento.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Una receta admite hasta 20 medicamentos.';
  end if;
  insert into public.prescriptions (patient_id, appointment_id, indications)
  values (p_patient_id, p_appointment_id, nullif(trim(p_indications), ''))
  returning id into v_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.prescription_items
      (prescription_id, position, medication, dose, frequency, duration, quantity, instructions)
    values (
      v_id, v_position,
      trim(v_item ->> 'medication'),
      nullif(trim(v_item ->> 'dose'), ''),
      nullif(trim(v_item ->> 'frequency'), ''),
      nullif(trim(v_item ->> 'duration'), ''),
      nullif(trim(v_item ->> 'quantity'), ''),
      nullif(trim(v_item ->> 'instructions'), '')
    );
  end loop;
  return v_id;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."enforce_appointment_no_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status in ('cancelada', 'no_asistio') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.starts_at = old.starts_at
     and new.duration_minutes = old.duration_minutes
     and new.doctor_id = old.doctor_id
     and old.status not in ('cancelada', 'no_asistio') then
    return new;
  end if;
  if exists (
    select 1
    from public.appointments a
    where a.doctor_id = new.doctor_id
      and a.id <> new.id
      and a.status not in ('cancelada', 'no_asistio')
      and public.appointment_range(a.starts_at, a.duration_minutes)
          && public.appointment_range(new.starts_at, new.duration_minutes)
  ) then
    raise exception 'El doctor ya tiene una cita en ese horario.'
      using errcode = 'P0001', hint = 'cita_solapada';
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."enforce_appointment_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_start timestamp := new.starts_at at time zone 'America/Santo_Domingo';
  v_end   timestamp := v_start + make_interval(mins => new.duration_minutes);
begin
  if new.status = 'cancelada' then
    return new;
  end if;
  -- En UPDATE solo se revisa si cambió el momento, el doctor o si se reactiva.
  if tg_op = 'UPDATE'
     and new.starts_at = old.starts_at
     and new.duration_minutes = old.duration_minutes
     and new.doctor_id = old.doctor_id
     and old.status <> 'cancelada' then
    return new;
  end if;
  -- Sin horario configurado no se restringe.
  if not exists (select 1 from public.doctor_schedules where doctor_id = new.doctor_id and active) then
    return new;
  end if;
  if exists (
    select 1 from public.doctor_time_off t
    where t.doctor_id = new.doctor_id and t.voided_at is null
      and v_start::date between t.starts_on and t.ends_on
  ) then
    raise exception 'El doctor tiene ese día libre.' using errcode = 'P0001', hint = 'fuera_de_horario';
  end if;
  if not exists (
    select 1 from public.doctor_schedules s
    where s.doctor_id = new.doctor_id and s.active
      and s.weekday = extract(dow from v_start)
      and s.start_time <= v_start::time
      and s.end_time >= v_end::time
      and v_end::date = v_start::date
  ) then
    raise exception 'La cita queda fuera del horario del doctor.' using errcode = 'P0001', hint = 'fuera_de_horario';
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."enforce_doctor_appointment_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if (select public.get_my_role()) = 'doctor' then
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.patient_id is distinct from old.patient_id
       or new.doctor_id is distinct from old.doctor_id
       or new.starts_at is distinct from old.starts_at
       or new.duration_minutes is distinct from old.duration_minutes
       or new.reason is distinct from old.reason then
      raise exception 'El doctor solo puede cambiar el estado de la cita.';
    end if;
    if new.status = 'cancelada' then
      raise exception 'Solo admin o recepción pueden cancelar citas.';
    end if;
    if old.status = 'cancelada' and new.status is distinct from old.status then
      raise exception 'Solo admin o recepción pueden reactivar una cita cancelada.';
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."ensure_profile_for_user"("p_user" "auth"."users") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_clinic uuid := nullif(p_user.raw_app_meta_data ->> 'clinic_id', '')::uuid;
begin
  if exists (select 1 from public.profiles where id = p_user.id) then
    return;  -- la clínica de un perfil no cambia nunca
  end if;
  -- Sin clínica en app_metadata (la escribe solo el servidor): sin perfil y sin
  -- acceso. Así un registro público en Auth nunca entra a ninguna clínica.
  if v_clinic is null or not exists (select 1 from public.clinics c where c.id = v_clinic and c.active) then
    return;
  end if;
  insert into public.profiles (id, full_name, clinic_id)
  values (p_user.id, coalesce(p_user.raw_user_meta_data ->> 'full_name', ''), v_clinic)
  on conflict (id) do nothing;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."get_my_clinic"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.clinic_id
    from public.profiles p
    join public.clinics c on c.id = p.clinic_id and c.active
   where p.id = auth.uid() and p.active;
$$;
CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.role
    from public.profiles p
    join public.clinics c on c.id = p.clinic_id and c.active
   where p.id = auth.uid() and p.active
     and public.mfa_satisfied();
$$;
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.ensure_profile_for_user(new);
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and public.mfa_satisfied();
$$;
CREATE OR REPLACE FUNCTION "public"."mfa_satisfied"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
      or (
        not exists (
          select 1 from auth.mfa_factors f
           where f.user_id = (select auth.uid())
             and f.factor_type in ('totp', 'webauthn')
             and f.status = 'verified'
        )
        and not exists (
          select 1 from public.profiles p
           where p.id = (select auth.uid())
             and p.role in ('admin', 'doctor')
        )
      );
$$;
CREATE OR REPLACE FUNCTION "public"."next_clinic_number"("p_clinic" "uuid", "p_name" "text") RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  insert into public.clinic_counters (clinic_id, name, value)
  values (p_clinic, p_name, 1)
  on conflict (clinic_id, name)
  do update set value = public.clinic_counters.value + 1
  returning value;
$$;
CREATE OR REPLACE FUNCTION "public"."patients_for_review"("p_cutoff" timestamp with time zone, "p_now" timestamp with time zone, "p_limit" integer DEFAULT 8) RETURNS TABLE("patient_id" "uuid", "full_name" "text", "phone" "text", "last_visit" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select p.id, p.full_name, p.phone, lv.last_visit
    from (
      select a.patient_id, max(a.starts_at) as last_visit
        from public.appointments a
       where a.status = 'completada'
         and a.starts_at < p_cutoff
       group by a.patient_id
    ) lv
    join public.patients p
      on p.id = lv.patient_id
     and p.archived_at is null
   where not exists (
           select 1
             from public.appointments r
            where r.patient_id = lv.patient_id
              and r.status = 'completada'
              and r.starts_at >= p_cutoff
         )
     and not exists (
           select 1
             from public.appointments u
            where u.patient_id = lv.patient_id
              and u.status in ('programada', 'confirmada')
              and u.starts_at > p_now
         )
   order by lv.last_visit desc, p.id
   limit least(greatest(coalesce(p_limit, 8), 1), 50);
$$;
CREATE OR REPLACE FUNCTION "public"."platform_assign_first_admin"("p_user" "uuid", "p_clinic" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede nombrar el primer administrador.';
  end if;
  if exists (select 1 from public.profiles where clinic_id = p_clinic and role = 'admin' and active) then
    raise exception 'Esta clínica ya tiene un administrador. Los demás los crea él en Cuentas.';
  end if;
  update public.profiles set role = 'admin'
   where id = p_user and clinic_id = p_clinic;
  if not found then
    raise exception 'El usuario no pertenece a esa clínica.';
  end if;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."platform_create_clinic"("p_name" "text", "p_address" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_tax_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede crear clínicas.';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Escribe el nombre de la clínica.';
  end if;
  insert into public.clinics (name, address, phone, tax_id)
  values (trim(p_name), nullif(trim(p_address), ''), nullif(trim(p_phone), ''), nullif(trim(p_tax_id), ''))
  returning id into v_id;
  return v_id;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."platform_list_clinics"() RETURNS TABLE("id" "uuid", "name" "text", "active" boolean, "created_at" timestamp with time zone, "admins" bigint, "patients" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede ver todas las clínicas.';
  end if;
  return query
    select c.id, c.name, c.active, c.created_at,
           (select count(*) from public.profiles p where p.clinic_id = c.id and p.role = 'admin' and p.active),
           (select count(*) from public.patients t where t.clinic_id = c.id)
      from public.clinics c
     order by c.created_at;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."platform_set_clinic_active"("p_clinic" "uuid", "p_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede activar o desactivar clínicas.';
  end if;
  update public.clinics set active = p_active where id = p_clinic;
  if not found then
    raise exception 'La clínica no existe.';
  end if;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
declare cmd record;
begin
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end; $$;
CREATE OR REPLACE FUNCTION "public"."set_clinic_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_ai_consent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.recorded_by := auth.uid();
  new.recorded_at := clock_timestamp();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_ai_draft"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_ok boolean;
begin
  if tg_op = 'INSERT' then
    -- Solo el dueño de una sesión activa de la misma consulta y paciente.
    if not exists (
      select 1 from public.ai_sessions s
       where s.id = new.session_id
         and s.user_id = auth.uid()
         and s.ended_at is null
         and s.encounter_id = new.encounter_id
         and s.patient_id = new.patient_id
    ) then
      raise exception 'El borrador debe pertenecer a una sesión de IA activa propia de esta consulta.';
    end if;
    if not exists (select 1 from public.encounters e where e.id = new.encounter_id and e.status = 'abierta') then
      raise exception 'La consulta está cerrada: no admite borradores.';
    end if;
    new.status := 'propuesto';
    new.accepted_record_id := null;
    new.decision_note := null;
    new.decided_by := null;
    new.decided_at := null;
    new.created_at := clock_timestamp();
    return new;
  end if;
  if old.status <> 'propuesto' then
    raise exception 'El borrador ya fue decidido y no se modifica.';
  end if;
  if new.status = 'propuesto' then
    raise exception 'Un borrador solo se acepta o se rechaza.';
  end if;
  if new.session_id is distinct from old.session_id
     or new.encounter_id is distinct from old.encounter_id
     or new.kind is distinct from old.kind
     or new.payload is distinct from old.payload
     or new.created_at is distinct from old.created_at then
    raise exception 'Al decidir un borrador solo cambian el estado, la nota y el registro aceptado.';
  end if;
  -- Firma: el doctor decide todo; el asistente dental solo signos vitales.
  if (select public.get_my_role()) <> 'doctor'
     and not ((select public.get_my_role()) = 'enfermeria' and old.kind = 'signos') then
    raise exception 'Solo el doctor decide este borrador.';
  end if;
  -- Aceptar exige el registro creado en la tabla clínica, de la misma consulta.
  if new.status = 'aceptado' and old.kind <> 'pregunta' then
    if new.accepted_record_id is null then
      raise exception 'Para aceptar un borrador hay que indicar el registro creado.';
    end if;
    v_ok := case old.kind
      when 'odontograma' then exists (select 1 from public.odontogram_entries r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'nota' then exists (select 1 from public.clinical_entries r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'signos' then exists (select 1 from public.vital_signs r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'plan' then exists (select 1 from public.treatment_plan_items r
        where r.id = new.accepted_record_id and r.patient_id = old.patient_id)
    end;
    if not v_ok then
      raise exception 'El registro aceptado no corresponde a este borrador.';
    end if;
  elsif new.accepted_record_id is not null then
    raise exception 'Una pregunta o un rechazo no llevan registro.';
  end if;
  new.decided_by := auth.uid();
  new.decided_at := clock_timestamp();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_ai_session"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_patient uuid;
  v_status public.encounter_status;
begin
  if tg_op = 'INSERT' then
    select e.patient_id, e.status into v_patient, v_status
      from public.encounters e where e.id = new.encounter_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La consulta no es de este paciente.';
    end if;
    if v_status <> 'abierta' then
      raise exception 'La consulta está cerrada: no admite sesiones de IA.';
    end if;
    if not public.ai_consent_active(new.patient_id, 'procesamiento_ia') then
      raise exception 'El paciente no ha dado consentimiento para procesamiento con IA.';
    end if;
    new.user_id := auth.uid();
    new.started_at := clock_timestamp();
    new.ended_at := null;
    new.input_tokens := 0;
    new.output_tokens := 0;
    new.cache_read_tokens := 0;
    new.cache_write_tokens := 0;
    new.cost_usd := 0;
    return new;
  end if;
  if old.ended_at is not null then
    raise exception 'La sesión de IA ya terminó y no se modifica.';
  end if;
  if new.encounter_id is distinct from old.encounter_id
     or new.user_id is distinct from old.user_id
     or new.model is distinct from old.model
     or new.started_at is distinct from old.started_at then
    raise exception 'De una sesión de IA solo cambian el consumo y el fin.';
  end if;
  -- El consumo solo sube: nadie puede bajar su uso para saltarse el límite.
  if new.input_tokens < old.input_tokens or new.output_tokens < old.output_tokens
     or new.cache_read_tokens < old.cache_read_tokens
     or new.cache_write_tokens < old.cache_write_tokens
     or new.cost_usd < old.cost_usd then
    raise exception 'El consumo de una sesión de IA no puede bajar.';
  end if;
  if new.ended_at is not null then
    new.ended_at := clock_timestamp();
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_billing_charge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_plan_patient uuid;
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    new.ars_status = case when new.ars_coverage > 0 then 'pendiente' else 'no_aplica' end;
    if new.treatment_plan_item_id is not null then
      select patient_id into v_plan_patient
        from public.treatment_plan_items where id = new.treatment_plan_item_id;
      if v_plan_patient is distinct from new.patient_id then
        raise exception 'El procedimiento del plan no es de este paciente.';
      end if;
    end if;
    return new;
  end if;
  -- Lo cobrado no se edita.
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.treatment_plan_item_id is distinct from old.treatment_plan_item_id
     or new.description is distinct from old.description
     or new.amount is distinct from old.amount
     or new.ars_coverage is distinct from old.ars_coverage
     or new.ars_name is distinct from old.ars_name
     or new.ars_authorization is distinct from old.ars_authorization then
    raise exception 'Un cargo registrado no se edita: anúlalo y registra uno nuevo.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  if old.voided_at is not null then
    raise exception 'Este cargo ya está anulado.';
  end if;
  -- Anular
  if new.voided_at is not null then
    new.voided_at = now();
    new.voided_by = auth.uid();
    new.ars_status = old.ars_status;
    return new;
  end if;
  new.voided_by = null;
  new.void_reason = null;
  -- Reclamo a la ARS: pendiente → reclamado → pagado o rechazado.
  if new.ars_status is distinct from old.ars_status then
    if not (
      (old.ars_status = 'pendiente' and new.ars_status = 'reclamado')
      or (old.ars_status = 'reclamado' and new.ars_status in ('pagado', 'rechazado'))
    ) then
      raise exception 'Cambio de estado de ARS no permitido: % → %.', old.ars_status, new.ars_status;
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_billing_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    -- receipt_number lo pone assign_receipt_number (consecutivo por clínica).
    new.received_by = auth.uid();
    new.received_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.receipt_number is distinct from old.receipt_number
     or new.amount is distinct from old.amount
     or new.method is distinct from old.method
     or new.reference is distinct from old.reference
     or new.note is distinct from old.note then
    raise exception 'Un pago registrado no se edita: anúlalo y registra uno nuevo.';
  end if;
  new.received_by = old.received_by;
  new.received_at = old.received_at;
  if old.voided_at is not null then
    raise exception 'Este pago ya está anulado.';
  end if;
  if new.voided_at is null then
    raise exception 'Un pago solo se puede anular.';
  end if;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_clinical_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_original_patient uuid;
begin
  new.author_id = auth.uid();
  new.author_role = (select public.get_my_role());
  new.created_at = now();
  if new.administered_at is not null and new.administered_at > now() + interval '5 minutes' then
    raise exception 'La hora de administración no puede estar en el futuro.';
  end if;
  if new.corrects_entry_id is not null then
    select patient_id into v_original_patient
      from public.clinical_entries
      where id = new.corrects_entry_id;
    if v_original_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la entrada original.';
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_has_by boolean := to_jsonb(new) ? 'created_by';
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    if v_has_by then
      new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
    end if;
  else
    new.created_at := old.created_at;
    if v_has_by then
      new := jsonb_populate_record(new, jsonb_build_object('created_by', to_jsonb(old) -> 'created_by'));
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_doctor_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.profiles where id = new.doctor_id and role = 'doctor' and active) then
      raise exception 'El horario debe ser de un doctor activo.';
    end if;
    if exists (
      select 1 from public.doctor_schedules s
      where s.doctor_id = new.doctor_id and s.weekday = new.weekday and s.active
        and s.start_time < new.end_time and new.start_time < s.end_time
    ) then
      raise exception 'Ese bloque se cruza con otro horario del mismo día.';
    end if;
    new.active = true;
    new.created_by = auth.uid();
    new.created_at = now();
    new.deactivated_by = null;
    new.deactivated_at = null;
    return new;
  end if;
  -- Solo se permite desactivar.
  if new.doctor_id is distinct from old.doctor_id
     or new.weekday is distinct from old.weekday
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
     or not (old.active and not new.active) then
    raise exception 'Un horario no se edita: desactívalo y crea otro.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.deactivated_by = auth.uid();
  new.deactivated_at = now();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_doctor_time_off"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.profiles where id = new.doctor_id and role = 'doctor' and active) then
      raise exception 'El día libre debe ser de un doctor activo.';
    end if;
    new.created_by = auth.uid();
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;
  -- Solo se permite anular (con motivo).
  if new.doctor_id is distinct from old.doctor_id
     or new.starts_on is distinct from old.starts_on
     or new.ends_on is distinct from old.ends_on
     or new.reason is distinct from old.reason
     or old.voided_at is not null
     or new.void_reason is null then
    raise exception 'Un día libre no se edita: anúlalo con motivo y crea otro.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_encounter"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    new.status := 'abierta';
    new.opened_by := auth.uid();
    new.opened_by_role := (select public.get_my_role());
    new.opened_at := now();
    new.closed_by := null;
    new.closed_at := null;
    new.closure_note := null;
    return new;
  end if;
  if old.status = 'cerrada' then
    raise exception 'La consulta ya está cerrada y no se modifica.';
  end if;
  if new.status <> 'cerrada' then
    raise exception 'Una consulta abierta solo se puede cerrar.';
  end if;
  if new.patient_id is distinct from old.patient_id
     or new.appointment_id is distinct from old.appointment_id
     or new.reason is distinct from old.reason
     or new.opened_by is distinct from old.opened_by
     or new.opened_by_role is distinct from old.opened_by_role
     or new.opened_at is distinct from old.opened_at then
    raise exception 'Al cerrar una consulta solo se agrega la nota de cierre.';
  end if;
  new.closed_by := auth.uid();
  new.closed_at := now();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_medical_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_by = auth.uid();
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_odontogram_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_original_patient uuid;
begin
  new.author_id = auth.uid();
  new.author_role = (select public.get_my_role());
  new.created_at = now();
  if new.corrects_entry_id is not null then
    select patient_id into v_original_patient
      from public.odontogram_entries
      where id = new.corrects_entry_id;
    if v_original_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la entrada original.';
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_patient_archive"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.archived_at is distinct from old.archived_at then
    if new.archived_at is not null then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      if (select public.get_my_role()) is distinct from 'admin' then
        raise exception 'Solo un administrador puede restaurar un paciente archivado.';
      end if;
      new.archived_by = null;
      new.archived_reason = null;
    end if;
  else
    new.archived_by = old.archived_by;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_prescription"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_name text;
  v_exequatur text;
  v_patient uuid;
begin
  if tg_op = 'INSERT' then
    select full_name, exequatur into v_name, v_exequatur
      from public.profiles where id = auth.uid() and role = 'doctor' and active;
    if v_name is null then
      raise exception 'Solo un doctor activo puede recetar.';
    end if;
    if coalesce(trim(v_exequatur), '') = '' then
      raise exception 'Falta el exequátur del doctor. Pídele al administrador que lo registre en Cuentas.';
    end if;
    if new.appointment_id is not null then
      select patient_id into v_patient from public.appointments where id = new.appointment_id;
      if v_patient is distinct from new.patient_id then
        raise exception 'La cita no es de este paciente.';
      end if;
    end if;
    new.doctor_id = auth.uid();
    new.doctor_name = v_name;
    new.doctor_exequatur = v_exequatur;
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;
  -- Solo se permite anular (una vez, con motivo).
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.appointment_id is distinct from old.appointment_id
     or new.indications is distinct from old.indications
     or new.doctor_id is distinct from old.doctor_id
     or new.doctor_name is distinct from old.doctor_name
     or new.doctor_exequatur is distinct from old.doctor_exequatur
     or new.created_at is distinct from old.created_at
     or old.voided_at is not null
     or new.void_reason is null then
    raise exception 'Una receta no se edita: anúlala con motivo y haz otra.';
  end if;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_prescription_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_patient uuid;
  v_doctor uuid;
  v_xmin text;
begin
  select patient_id, doctor_id, xmin::text into v_patient, v_doctor, v_xmin
    from public.prescriptions where id = new.prescription_id;
  if v_patient is null then
    raise exception 'La receta no existe.';
  end if;
  -- Los medicamentos solo se agregan en la misma transacción que creó la receta.
  if v_xmin is distinct from (pg_current_xact_id()::xid)::text then
    raise exception 'No se pueden agregar medicamentos a una receta ya guardada.';
  end if;
  if v_doctor is distinct from auth.uid() then
    raise exception 'Solo el doctor que receta agrega los medicamentos.';
  end if;
  new.patient_id = v_patient;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador del usuario.';
  end if;
  new.created_at = old.created_at;
  if auth.uid() = old.id
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.';
  end if;
  if old.role = 'admin' and old.active
     and (new.role is distinct from 'admin' or not new.active)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and active and id <> old.id and clinic_id = old.clinic_id
     ) then
    raise exception 'Debe quedar al menos un administrador activo.';
  end if;
  if new.active is distinct from old.active then
    if new.active then
      new.deactivated_at = null;
      new.deactivated_by = null;
      new.deactivated_reason = null;
    else
      new.deactivated_at = now();
      new.deactivated_by = auth.uid();
    end if;
  else
    new.deactivated_at = old.deactivated_at;
    new.deactivated_by = old.deactivated_by;
    new.deactivated_reason = old.deactivated_reason;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_queue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    new.status = 'en_espera';
    new.checked_in_at = now();
    new.called_at = null;
    new.finished_at = null;
    return new;
  end if;
  -- El doctor solo cambia el estado de sus propios turnos.
  if (select public.get_my_role()) = 'doctor' then
    if new.id is distinct from old.id
       or new.queue_date is distinct from old.queue_date
       or new.position is distinct from old.position
       or new.patient_id is distinct from old.patient_id
       or new.appointment_id is distinct from old.appointment_id
       or new.doctor_id is distinct from old.doctor_id then
      raise exception 'El doctor solo puede cambiar el estado del turno.';
    end if;
  end if;
  new.checked_in_at = old.checked_in_at;
  new.called_at = old.called_at;
  new.finished_at = old.finished_at;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'en_espera' and new.status = 'llamado')
      or (old.status = 'llamado' and new.status = 'en_atencion')
      or (old.status = 'en_atencion' and new.status = 'atendido')
      or (new.status = 'cancelado' and old.status not in ('atendido', 'cancelado'))
    ) then
      raise exception 'Cambio de estado no permitido: % → %.', old.status, new.status;
    end if;
    if new.status = 'llamado' then
      new.called_at = now();
    elsif new.status in ('atendido', 'cancelado') then
      new.finished_at = now();
    end if;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_treatment_plan_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    new.status = 'pendiente';
    new.cancel_reason = null;
    new.created_by = auth.uid();
    new.created_at = now();
    new.started_at = null;
    new.completed_at = null;
    new.completed_by = null;
    new.cancelled_at = null;
    new.cancelled_by = null;
    return new;
  end if;
  -- Lo registrado no cambia: solo el estado (y el motivo al cancelar).
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.tooth is distinct from old.tooth
     or new.surfaces is distinct from old.surfaces
     or new.procedure is distinct from old.procedure
     or new.estimated_cost is distinct from old.estimated_cost
     or new.note is distinct from old.note then
    raise exception 'Solo se puede cambiar el estado del procedimiento.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.started_at = old.started_at;
  new.completed_at = old.completed_at;
  new.completed_by = old.completed_by;
  new.cancelled_at = old.cancelled_at;
  new.cancelled_by = old.cancelled_by;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pendiente' and new.status in ('en_proceso', 'completado', 'cancelado'))
      or (old.status = 'en_proceso' and new.status in ('completado', 'cancelado'))
    ) then
      raise exception 'Cambio de estado no permitido: % → %.', old.status, new.status;
    end if;
    if new.status = 'en_proceso' then
      new.started_at = now();
    elsif new.status = 'completado' then
      new.started_at = coalesce(old.started_at, now());
      new.completed_at = now();
      new.completed_by = auth.uid();
    elsif new.status = 'cancelado' then
      new.cancelled_at = now();
      new.cancelled_by = auth.uid();
    end if;
  else
    new.cancel_reason = old.cancel_reason;
  end if;
  return new;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."stamp_vital_signs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_patient uuid;
begin
  new.author_id = auth.uid();
  new.author_role = (select public.get_my_role());
  new.created_at = now();
  if new.appointment_id is not null then
    select patient_id into v_patient from public.appointments where id = new.appointment_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La cita no es de este paciente.';
    end if;
  end if;
  if new.corrects_entry_id is not null then
    select patient_id into v_patient from public.vital_signs where id = new.corrects_entry_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la toma original.';
    end if;
  end if;
  return new;
end;
$$;
CREATE TABLE IF NOT EXISTS "public"."ai_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "scope" "public"."ai_consent_scope" NOT NULL,
    "granted" boolean NOT NULL,
    "note" "text",
    "recorded_by" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "ai_consents_note_check" CHECK ((("note" IS NULL) OR ("length"("note") <= 500)))
);
CREATE TABLE IF NOT EXISTS "public"."ai_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "kind" "public"."ai_draft_kind" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "public"."ai_draft_status" DEFAULT 'propuesto'::"public"."ai_draft_status" NOT NULL,
    "accepted_record_id" "uuid",
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decided_by" "uuid",
    "decided_at" timestamp with time zone,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "ai_drafts_decided_consistent" CHECK ((("status" = 'propuesto'::"public"."ai_draft_status") = ("decided_at" IS NULL))),
    CONSTRAINT "ai_drafts_decision_note_check" CHECK ((("decision_note" IS NULL) OR ("length"("decision_note") <= 500))),
    CONSTRAINT "ai_drafts_payload_check" CHECK ((("jsonb_typeof"("payload") = 'object'::"text") AND ("pg_column_size"("payload") <= 16384))),
    CONSTRAINT "ai_drafts_record_only_if_accepted" CHECK ((("accepted_record_id" IS NULL) OR ("status" = 'aceptado'::"public"."ai_draft_status")))
);
CREATE TABLE IF NOT EXISTS "public"."ai_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "model" "text" NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "cache_read_tokens" integer DEFAULT 0 NOT NULL,
    "cache_write_tokens" integer DEFAULT 0 NOT NULL,
    "cost_usd" numeric(10,4) DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "ai_sessions_cache_read_tokens_check" CHECK (("cache_read_tokens" >= 0)),
    CONSTRAINT "ai_sessions_cache_write_tokens_check" CHECK (("cache_write_tokens" >= 0)),
    CONSTRAINT "ai_sessions_cost_usd_check" CHECK (("cost_usd" >= (0)::numeric)),
    CONSTRAINT "ai_sessions_input_tokens_check" CHECK (("input_tokens" >= 0)),
    CONSTRAINT "ai_sessions_model_check" CHECK ((("length"("model") >= 3) AND ("length"("model") <= 100))),
    CONSTRAINT "ai_sessions_output_tokens_check" CHECK (("output_tokens" >= 0))
);
CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "duration_minutes" integer DEFAULT 30 NOT NULL,
    "reason" "text",
    "status" "public"."appointment_status" DEFAULT 'programada'::"public"."appointment_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "appointments_duration_minutes_check" CHECK (("duration_minutes" > 0))
);
CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "patient_id" "uuid",
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "audit_log_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);
ALTER TABLE "public"."audit_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE IF NOT EXISTS "public"."billing_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "treatment_plan_item_id" "uuid",
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "ars_coverage" numeric(12,2) DEFAULT 0 NOT NULL,
    "patient_amount" numeric(12,2) GENERATED ALWAYS AS (("amount" - "ars_coverage")) STORED,
    "ars_name" "text",
    "ars_authorization" "text",
    "ars_status" "public"."ars_claim_status" DEFAULT 'no_aplica'::"public"."ars_claim_status" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "billing_charges_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "billing_charges_ars" CHECK (((("ars_coverage" = (0)::numeric) AND ("ars_status" = 'no_aplica'::"public"."ars_claim_status")) OR (("ars_coverage" > (0)::numeric) AND ("ars_status" <> 'no_aplica'::"public"."ars_claim_status") AND ("length"(TRIM(BOTH FROM COALESCE("ars_name", ''::"text"))) > 0)))),
    CONSTRAINT "billing_charges_ars_authorization_check" CHECK ((("ars_authorization" IS NULL) OR ("length"("ars_authorization") <= 60))),
    CONSTRAINT "billing_charges_ars_coverage_check" CHECK (("ars_coverage" >= (0)::numeric)),
    CONSTRAINT "billing_charges_ars_name_check" CHECK ((("ars_name" IS NULL) OR ("length"("ars_name") <= 120))),
    CONSTRAINT "billing_charges_coverage" CHECK (("ars_coverage" <= "amount")),
    CONSTRAINT "billing_charges_description_check" CHECK ((("length"(TRIM(BOTH FROM "description")) >= 2) AND ("length"(TRIM(BOTH FROM "description")) <= 200))),
    CONSTRAINT "billing_charges_void" CHECK (((("voided_at" IS NULL) AND ("void_reason" IS NULL)) OR (("voided_at" IS NOT NULL) AND ("length"(TRIM(BOTH FROM COALESCE("void_reason", ''::"text"))) >= 5)))),
    CONSTRAINT "billing_charges_void_reason_check" CHECK ((("void_reason" IS NULL) OR ("length"("void_reason") <= 500)))
);
CREATE TABLE IF NOT EXISTS "public"."billing_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "receipt_number" bigint NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "reference" "text",
    "note" "text",
    "received_by" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "billing_payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "billing_payments_note_check" CHECK ((("note" IS NULL) OR ("length"("note") <= 500))),
    CONSTRAINT "billing_payments_reference_check" CHECK ((("reference" IS NULL) OR ("length"("reference") <= 100))),
    CONSTRAINT "billing_payments_void" CHECK (((("voided_at" IS NULL) AND ("void_reason" IS NULL)) OR (("voided_at" IS NOT NULL) AND ("length"(TRIM(BOTH FROM COALESCE("void_reason", ''::"text"))) >= 5)))),
    CONSTRAINT "billing_payments_void_reason_check" CHECK ((("void_reason" IS NULL) OR ("length"("void_reason") <= 500)))
);
CREATE TABLE IF NOT EXISTS "public"."clinic_counters" (
    "clinic_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "value" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "clinic_counters_name_check" CHECK (("name" = ANY (ARRAY['record'::"text", 'receipt'::"text"])))
);
CREATE TABLE IF NOT EXISTS "public"."clinical_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "kind" "public"."clinical_entry_kind" NOT NULL,
    "body" "text",
    "medication_name" "text",
    "dose" "text",
    "route" "text",
    "administered_at" timestamp with time zone,
    "corrects_entry_id" "uuid",
    "correction_reason" "text",
    "author_id" "uuid",
    "author_role" "public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "source" "public"."record_source" DEFAULT 'manual'::"public"."record_source" NOT NULL,
    CONSTRAINT "clinical_entries_body_check" CHECK ((("body" IS NULL) OR ("length"("body") <= 4000))),
    CONSTRAINT "clinical_entries_content" CHECK (((("kind" = 'medicamento'::"public"."clinical_entry_kind") AND ("length"(TRIM(BOTH FROM COALESCE("medication_name", ''::"text"))) > 0) AND ("length"(TRIM(BOTH FROM COALESCE("dose", ''::"text"))) > 0) AND ("length"(TRIM(BOTH FROM COALESCE("route", ''::"text"))) > 0) AND ("administered_at" IS NOT NULL)) OR (("kind" = ANY (ARRAY['nota'::"public"."clinical_entry_kind", 'procedimiento'::"public"."clinical_entry_kind"])) AND ("length"(TRIM(BOTH FROM COALESCE("body", ''::"text"))) > 0)))),
    CONSTRAINT "clinical_entries_correction" CHECK (((("corrects_entry_id" IS NULL) AND ("correction_reason" IS NULL)) OR (("corrects_entry_id" IS NOT NULL) AND ("length"(TRIM(BOTH FROM COALESCE("correction_reason", ''::"text"))) >= 5)))),
    CONSTRAINT "clinical_entries_correction_reason_check" CHECK ((("correction_reason" IS NULL) OR ("length"("correction_reason") <= 500))),
    CONSTRAINT "clinical_entries_dose_check" CHECK ((("dose" IS NULL) OR ("length"("dose") <= 100))),
    CONSTRAINT "clinical_entries_ia_needs_encounter" CHECK ((("source" = 'manual'::"public"."record_source") OR ("encounter_id" IS NOT NULL))),
    CONSTRAINT "clinical_entries_medication_name_check" CHECK ((("medication_name" IS NULL) OR ("length"("medication_name") <= 200))),
    CONSTRAINT "clinical_entries_route_check" CHECK ((("route" IS NULL) OR ("length"("route") <= 100)))
);
CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "tax_id" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "clinics_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);
CREATE TABLE IF NOT EXISTS "public"."doctor_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deactivated_by" "uuid",
    "deactivated_at" timestamp with time zone,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "doctor_schedules_range" CHECK (("end_time" > "start_time")),
    CONSTRAINT "doctor_schedules_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);
CREATE TABLE IF NOT EXISTS "public"."doctor_time_off" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "reason" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "doctor_time_off_range" CHECK (("ends_on" >= "starts_on")),
    CONSTRAINT "doctor_time_off_reason_check" CHECK ((("length"(TRIM(BOTH FROM "reason")) >= 3) AND ("length"(TRIM(BOTH FROM "reason")) <= 200))),
    CONSTRAINT "doctor_time_off_void" CHECK ((("voided_at" IS NULL) = ("void_reason" IS NULL))),
    CONSTRAINT "doctor_time_off_void_reason_check" CHECK ((("void_reason" IS NULL) OR (("length"(TRIM(BOTH FROM "void_reason")) >= 5) AND ("length"(TRIM(BOTH FROM "void_reason")) <= 500))))
);
CREATE TABLE IF NOT EXISTS "public"."encounters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "reason" "text",
    "status" "public"."encounter_status" DEFAULT 'abierta'::"public"."encounter_status" NOT NULL,
    "opened_by" "uuid",
    "opened_by_role" "public"."user_role",
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_by" "uuid",
    "closed_at" timestamp with time zone,
    "closure_note" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "encounters_closed_consistent" CHECK ((("status" = 'cerrada'::"public"."encounter_status") = ("closed_at" IS NOT NULL))),
    CONSTRAINT "encounters_closure_note_check" CHECK ((("closure_note" IS NULL) OR ("length"("closure_note") <= 1000))),
    CONSTRAINT "encounters_reason_check" CHECK ((("reason" IS NULL) OR ("length"("reason") <= 500)))
);
CREATE TABLE IF NOT EXISTS "public"."odontogram_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tooth" smallint NOT NULL,
    "surfaces" "text"[],
    "condition" "public"."odontogram_condition",
    "note" "text",
    "corrects_entry_id" "uuid",
    "correction_reason" "text",
    "author_id" "uuid",
    "author_role" "public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "source" "public"."record_source" DEFAULT 'manual'::"public"."record_source" NOT NULL,
    CONSTRAINT "odontogram_entries_content" CHECK ((("condition" IS NOT NULL) OR ("corrects_entry_id" IS NOT NULL))),
    CONSTRAINT "odontogram_entries_correction" CHECK (((("corrects_entry_id" IS NULL) AND ("correction_reason" IS NULL)) OR (("corrects_entry_id" IS NOT NULL) AND ("length"(TRIM(BOTH FROM COALESCE("correction_reason", ''::"text"))) >= 5)))),
    CONSTRAINT "odontogram_entries_correction_reason_check" CHECK ((("correction_reason" IS NULL) OR ("length"("correction_reason") <= 500))),
    CONSTRAINT "odontogram_entries_ia_needs_encounter" CHECK ((("source" = 'manual'::"public"."record_source") OR ("encounter_id" IS NOT NULL))),
    CONSTRAINT "odontogram_entries_note_check" CHECK ((("note" IS NULL) OR ("length"("note") <= 500))),
    CONSTRAINT "odontogram_entries_surfaces" CHECK ((("condition" IS NULL) OR (("condition" = ANY (ARRAY['caries'::"public"."odontogram_condition", 'obturacion'::"public"."odontogram_condition", 'sellante'::"public"."odontogram_condition"])) AND ("surfaces" IS NOT NULL)) OR (("condition" <> ALL (ARRAY['caries'::"public"."odontogram_condition", 'obturacion'::"public"."odontogram_condition", 'sellante'::"public"."odontogram_condition"])) AND ("surfaces" IS NULL)))),
    CONSTRAINT "odontogram_entries_surfaces_check" CHECK ((("surfaces" IS NULL) OR ((("cardinality"("surfaces") >= 1) AND ("cardinality"("surfaces") <= 5)) AND ("surfaces" <@ ARRAY['M'::"text", 'D'::"text", 'O'::"text", 'V'::"text", 'L'::"text"])))),
    CONSTRAINT "odontogram_entries_tooth_check" CHECK (((((("tooth" / 10) >= 1) AND (("tooth" / 10) <= 4)) AND (((("tooth")::integer % 10) >= 1) AND ((("tooth")::integer % 10) <= 8))) OR (((("tooth" / 10) >= 5) AND (("tooth" / 10) <= 8)) AND (((("tooth")::integer % 10) >= 1) AND ((("tooth")::integer % 10) <= 5)))))
);
CREATE TABLE IF NOT EXISTS "public"."patient_medical_history" (
    "patient_id" "uuid" NOT NULL,
    "allergy_penicillin" boolean DEFAULT false NOT NULL,
    "allergy_local_anesthetic" boolean DEFAULT false NOT NULL,
    "allergy_latex" boolean DEFAULT false NOT NULL,
    "allergy_nsaids" boolean DEFAULT false NOT NULL,
    "allergies_other" "text",
    "takes_anticoagulants" boolean DEFAULT false NOT NULL,
    "takes_bisphosphonates" boolean DEFAULT false NOT NULL,
    "current_medications" "text",
    "has_diabetes" boolean DEFAULT false NOT NULL,
    "has_hypertension" boolean DEFAULT false NOT NULL,
    "has_heart_disease" boolean DEFAULT false NOT NULL,
    "is_pregnant" boolean DEFAULT false NOT NULL,
    "conditions_other" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "document_id" "text",
    "birth_date" "date",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "record_number" integer NOT NULL,
    "insurance_type" "public"."insurance_type",
    "insurance_provider" "text",
    "affiliate_number" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archived_reason" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "patients_archive_consistency" CHECK (((("archived_at" IS NULL) AND ("archived_reason" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_reason" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "archived_reason")) > 0)))),
    CONSTRAINT "patients_insurance_consistency" CHECK (((("insurance_type" = 'ars'::"public"."insurance_type") AND ("insurance_provider" IS NOT NULL) AND ("affiliate_number" IS NOT NULL)) OR (("insurance_type" = 'privado'::"public"."insurance_type") AND ("insurance_provider" IS NULL) AND ("affiliate_number" IS NULL)) OR ("insurance_type" IS NULL)))
);
CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."prescription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prescription_id" "uuid" NOT NULL,
    "patient_id" "uuid",
    "position" smallint NOT NULL,
    "medication" "text" NOT NULL,
    "dose" "text",
    "frequency" "text",
    "duration" "text",
    "quantity" "text",
    "instructions" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "prescription_items_dose_check" CHECK ((("dose" IS NULL) OR ("length"("dose") <= 100))),
    CONSTRAINT "prescription_items_duration_check" CHECK ((("duration" IS NULL) OR ("length"("duration") <= 100))),
    CONSTRAINT "prescription_items_frequency_check" CHECK ((("frequency" IS NULL) OR ("length"("frequency") <= 100))),
    CONSTRAINT "prescription_items_instructions_check" CHECK ((("instructions" IS NULL) OR ("length"("instructions") <= 300))),
    CONSTRAINT "prescription_items_medication_check" CHECK ((("length"(TRIM(BOTH FROM "medication")) >= 2) AND ("length"(TRIM(BOTH FROM "medication")) <= 200))),
    CONSTRAINT "prescription_items_position_check" CHECK ((("position" >= 1) AND ("position" <= 20))),
    CONSTRAINT "prescription_items_quantity_check" CHECK ((("quantity" IS NULL) OR ("length"("quantity") <= 50)))
);
CREATE TABLE IF NOT EXISTS "public"."prescriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "indications" "text",
    "doctor_id" "uuid",
    "doctor_name" "text" DEFAULT ''::"text" NOT NULL,
    "doctor_exequatur" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "clinic_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    CONSTRAINT "prescriptions_indications_check" CHECK ((("indications" IS NULL) OR ("length"("indications") <= 1000))),
    CONSTRAINT "prescriptions_void" CHECK ((("voided_at" IS NULL) = ("void_reason" IS NULL))),
    CONSTRAINT "prescriptions_void_reason_check" CHECK ((("void_reason" IS NULL) OR (("length"(TRIM(BOTH FROM "void_reason")) >= 5) AND ("length"(TRIM(BOTH FROM "void_reason")) <= 500))))
);
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'recepcion'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "deactivated_at" timestamp with time zone,
    "deactivated_by" "uuid",
    "deactivated_reason" "text",
    "exequatur" "text",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "profiles_deactivated_reason_required" CHECK (("active" OR ("length"(TRIM(BOTH FROM COALESCE("deactivated_reason", ''::"text"))) > 0))),
    CONSTRAINT "profiles_exequatur_check" CHECK ((("exequatur" IS NULL) OR ("exequatur" ~ '^[0-9A-Za-z./-]{1,30}$'::"text")))
);
CREATE TABLE IF NOT EXISTS "public"."queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "queue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "position" integer NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "doctor_id" "uuid",
    "status" "public"."queue_status" DEFAULT 'en_espera'::"public"."queue_status" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "called_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "queue_position_check" CHECK (("position" > 0))
);
CREATE TABLE IF NOT EXISTS "public"."treatment_plan_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tooth" smallint,
    "surfaces" "text"[],
    "procedure" "text" NOT NULL,
    "estimated_cost" numeric(12,2),
    "note" "text",
    "status" "public"."treatment_status" DEFAULT 'pendiente'::"public"."treatment_status" NOT NULL,
    "cancel_reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "clinic_id" "uuid" NOT NULL,
    CONSTRAINT "treatment_plan_items_cancel" CHECK (((("status" <> 'cancelado'::"public"."treatment_status") AND ("cancel_reason" IS NULL)) OR (("status" = 'cancelado'::"public"."treatment_status") AND ("length"(TRIM(BOTH FROM COALESCE("cancel_reason", ''::"text"))) >= 5)))),
    CONSTRAINT "treatment_plan_items_cancel_reason_check" CHECK ((("cancel_reason" IS NULL) OR ("length"("cancel_reason") <= 500))),
    CONSTRAINT "treatment_plan_items_estimated_cost_check" CHECK ((("estimated_cost" IS NULL) OR ("estimated_cost" >= (0)::numeric))),
    CONSTRAINT "treatment_plan_items_note_check" CHECK ((("note" IS NULL) OR ("length"("note") <= 500))),
    CONSTRAINT "treatment_plan_items_procedure_check" CHECK ((("length"(TRIM(BOTH FROM "procedure")) >= 2) AND ("length"(TRIM(BOTH FROM "procedure")) <= 200))),
    CONSTRAINT "treatment_plan_items_surfaces" CHECK ((("surfaces" IS NULL) OR ("tooth" IS NOT NULL))),
    CONSTRAINT "treatment_plan_items_surfaces_check" CHECK ((("surfaces" IS NULL) OR ((("cardinality"("surfaces") >= 1) AND ("cardinality"("surfaces") <= 5)) AND ("surfaces" <@ ARRAY['M'::"text", 'D'::"text", 'O'::"text", 'V'::"text", 'L'::"text"])))),
    CONSTRAINT "treatment_plan_items_tooth_check" CHECK ((("tooth" IS NULL) OR (((("tooth" / 10) >= 1) AND (("tooth" / 10) <= 4)) AND (((("tooth")::integer % 10) >= 1) AND ((("tooth")::integer % 10) <= 8))) OR (((("tooth" / 10) >= 5) AND (("tooth" / 10) <= 8)) AND (((("tooth")::integer % 10) >= 1) AND ((("tooth")::integer % 10) <= 5)))))
);
CREATE TABLE IF NOT EXISTS "public"."vital_signs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "systolic" smallint,
    "diastolic" smallint,
    "heart_rate" smallint,
    "glucose_mg_dl" smallint,
    "oxygen_saturation" smallint,
    "note" "text",
    "corrects_entry_id" "uuid",
    "correction_reason" "text",
    "author_id" "uuid",
    "author_role" "public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "source" "public"."record_source" DEFAULT 'manual'::"public"."record_source" NOT NULL,
    CONSTRAINT "vital_signs_bp_order" CHECK ((("systolic" IS NULL) OR ("systolic" > "diastolic"))),
    CONSTRAINT "vital_signs_bp_pair" CHECK ((("systolic" IS NULL) = ("diastolic" IS NULL))),
    CONSTRAINT "vital_signs_correction" CHECK ((("corrects_entry_id" IS NULL) = ("correction_reason" IS NULL))),
    CONSTRAINT "vital_signs_correction_reason_check" CHECK ((("correction_reason" IS NULL) OR (("length"(TRIM(BOTH FROM "correction_reason")) >= 5) AND ("length"(TRIM(BOTH FROM "correction_reason")) <= 500)))),
    CONSTRAINT "vital_signs_diastolic_check" CHECK ((("diastolic" IS NULL) OR (("diastolic" >= 30) AND ("diastolic" <= 160)))),
    CONSTRAINT "vital_signs_glucose_mg_dl_check" CHECK ((("glucose_mg_dl" IS NULL) OR (("glucose_mg_dl" >= 20) AND ("glucose_mg_dl" <= 600)))),
    CONSTRAINT "vital_signs_heart_rate_check" CHECK ((("heart_rate" IS NULL) OR (("heart_rate" >= 30) AND ("heart_rate" <= 220)))),
    CONSTRAINT "vital_signs_ia_needs_encounter" CHECK ((("source" = 'manual'::"public"."record_source") OR ("encounter_id" IS NOT NULL))),
    CONSTRAINT "vital_signs_note_check" CHECK ((("note" IS NULL) OR ("length"("note") <= 500))),
    CONSTRAINT "vital_signs_oxygen_saturation_check" CHECK ((("oxygen_saturation" IS NULL) OR (("oxygen_saturation" >= 50) AND ("oxygen_saturation" <= 100)))),
    CONSTRAINT "vital_signs_some_value" CHECK ((("systolic" IS NOT NULL) OR ("heart_rate" IS NOT NULL) OR ("glucose_mg_dl" IS NOT NULL) OR ("oxygen_saturation" IS NOT NULL))),
    CONSTRAINT "vital_signs_systolic_check" CHECK ((("systolic" IS NULL) OR (("systolic" >= 60) AND ("systolic" <= 260))))
);
ALTER TABLE ONLY "public"."ai_consents"
    ADD CONSTRAINT "ai_consents_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_sessions"
    ADD CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_no_overlap" EXCLUDE USING "gist" ("doctor_id" WITH =, "public"."appointment_range"("starts_at", "duration_minutes") WITH &&) WHERE (("status" <> ALL (ARRAY['cancelada'::"public"."appointment_status", 'no_asistio'::"public"."appointment_status"])));
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_clinic_receipt_number_key" UNIQUE ("clinic_id", "receipt_number");
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinic_counters"
    ADD CONSTRAINT "clinic_counters_pkey" PRIMARY KEY ("clinic_id", "name");
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."doctor_time_off"
    ADD CONSTRAINT "doctor_time_off_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_pkey" PRIMARY KEY ("patient_id");
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinic_document_id_key" UNIQUE ("clinic_id", "document_id");
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinic_record_number_key" UNIQUE ("clinic_id", "record_number");
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_key" UNIQUE ("user_id");
ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_prescription_id_position_key" UNIQUE ("prescription_id", "position");
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_clinic_date_position_key" UNIQUE ("clinic_id", "queue_date", "position");
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id");
CREATE INDEX "ai_consents_clinic_id_idx" ON "public"."ai_consents" USING "btree" ("clinic_id");
CREATE INDEX "ai_consents_patient_idx" ON "public"."ai_consents" USING "btree" ("patient_id", "scope", "recorded_at" DESC);
CREATE INDEX "ai_consents_recorded_by_idx" ON "public"."ai_consents" USING "btree" ("recorded_by");
CREATE INDEX "ai_drafts_clinic_id_idx" ON "public"."ai_drafts" USING "btree" ("clinic_id");
CREATE INDEX "ai_drafts_decided_by_idx" ON "public"."ai_drafts" USING "btree" ("decided_by");
CREATE INDEX "ai_drafts_encounter_idx" ON "public"."ai_drafts" USING "btree" ("encounter_id", "status");
CREATE INDEX "ai_drafts_patient_idx" ON "public"."ai_drafts" USING "btree" ("patient_id");
CREATE INDEX "ai_drafts_session_idx" ON "public"."ai_drafts" USING "btree" ("session_id");
CREATE INDEX "ai_sessions_clinic_started_idx" ON "public"."ai_sessions" USING "btree" ("clinic_id", "started_at");
CREATE INDEX "ai_sessions_encounter_idx" ON "public"."ai_sessions" USING "btree" ("encounter_id");
CREATE INDEX "ai_sessions_patient_idx" ON "public"."ai_sessions" USING "btree" ("patient_id");
CREATE INDEX "ai_sessions_user_idx" ON "public"."ai_sessions" USING "btree" ("user_id");
CREATE INDEX "appointments_clinic_id_idx" ON "public"."appointments" USING "btree" ("clinic_id");
CREATE INDEX "appointments_completed_patient_starts_idx" ON "public"."appointments" USING "btree" ("patient_id", "starts_at") WHERE ("status" = 'completada'::"public"."appointment_status");
CREATE INDEX "appointments_doctor_starts_idx" ON "public"."appointments" USING "btree" ("doctor_id", "starts_at");
CREATE INDEX "appointments_patient_idx" ON "public"."appointments" USING "btree" ("patient_id");
CREATE INDEX "audit_log_changed_by_idx" ON "public"."audit_log" USING "btree" ("changed_by");
CREATE INDEX "audit_log_clinic_id_idx" ON "public"."audit_log" USING "btree" ("clinic_id");
CREATE INDEX "audit_log_patient_idx" ON "public"."audit_log" USING "btree" ("patient_id", "changed_at" DESC);
CREATE INDEX "billing_charges_clinic_id_idx" ON "public"."billing_charges" USING "btree" ("clinic_id");
CREATE INDEX "billing_charges_created_by_idx" ON "public"."billing_charges" USING "btree" ("created_by");
CREATE UNIQUE INDEX "billing_charges_one_active_per_plan_item" ON "public"."billing_charges" USING "btree" ("treatment_plan_item_id") WHERE (("treatment_plan_item_id" IS NOT NULL) AND ("voided_at" IS NULL));
CREATE INDEX "billing_charges_patient_idx" ON "public"."billing_charges" USING "btree" ("patient_id", "created_at");
CREATE INDEX "billing_charges_voided_by_idx" ON "public"."billing_charges" USING "btree" ("voided_by");
CREATE INDEX "billing_payments_clinic_id_idx" ON "public"."billing_payments" USING "btree" ("clinic_id");
CREATE INDEX "billing_payments_patient_idx" ON "public"."billing_payments" USING "btree" ("patient_id", "received_at");
CREATE INDEX "billing_payments_received_by_idx" ON "public"."billing_payments" USING "btree" ("received_by");
CREATE INDEX "billing_payments_voided_by_idx" ON "public"."billing_payments" USING "btree" ("voided_by");
CREATE INDEX "clinical_entries_author_id_idx" ON "public"."clinical_entries" USING "btree" ("author_id");
CREATE INDEX "clinical_entries_clinic_id_idx" ON "public"."clinical_entries" USING "btree" ("clinic_id");
CREATE INDEX "clinical_entries_encounter_idx" ON "public"."clinical_entries" USING "btree" ("encounter_id");
CREATE UNIQUE INDEX "clinical_entries_one_correction" ON "public"."clinical_entries" USING "btree" ("corrects_entry_id") WHERE ("corrects_entry_id" IS NOT NULL);
CREATE INDEX "clinical_entries_patient_idx" ON "public"."clinical_entries" USING "btree" ("patient_id", "created_at" DESC);
CREATE INDEX "doctor_schedules_clinic_id_idx" ON "public"."doctor_schedules" USING "btree" ("clinic_id");
CREATE INDEX "doctor_schedules_created_by_idx" ON "public"."doctor_schedules" USING "btree" ("created_by");
CREATE INDEX "doctor_schedules_deactivated_by_idx" ON "public"."doctor_schedules" USING "btree" ("deactivated_by");
CREATE INDEX "doctor_schedules_doctor_idx" ON "public"."doctor_schedules" USING "btree" ("doctor_id", "weekday") WHERE "active";
CREATE INDEX "doctor_time_off_clinic_id_idx" ON "public"."doctor_time_off" USING "btree" ("clinic_id");
CREATE INDEX "doctor_time_off_created_by_idx" ON "public"."doctor_time_off" USING "btree" ("created_by");
CREATE INDEX "doctor_time_off_doctor_idx" ON "public"."doctor_time_off" USING "btree" ("doctor_id", "starts_on") WHERE ("voided_at" IS NULL);
CREATE INDEX "doctor_time_off_voided_by_idx" ON "public"."doctor_time_off" USING "btree" ("voided_by");
CREATE UNIQUE INDEX "encounters_appointment_key" ON "public"."encounters" USING "btree" ("appointment_id") WHERE ("appointment_id" IS NOT NULL);
CREATE INDEX "encounters_clinic_id_idx" ON "public"."encounters" USING "btree" ("clinic_id");
CREATE INDEX "encounters_closed_by_idx" ON "public"."encounters" USING "btree" ("closed_by");
CREATE INDEX "encounters_opened_by_idx" ON "public"."encounters" USING "btree" ("opened_by");
CREATE INDEX "encounters_patient_idx" ON "public"."encounters" USING "btree" ("patient_id", "opened_at");
CREATE INDEX "odontogram_entries_author_id_idx" ON "public"."odontogram_entries" USING "btree" ("author_id");
CREATE INDEX "odontogram_entries_clinic_id_idx" ON "public"."odontogram_entries" USING "btree" ("clinic_id");
CREATE INDEX "odontogram_entries_encounter_idx" ON "public"."odontogram_entries" USING "btree" ("encounter_id");
CREATE UNIQUE INDEX "odontogram_entries_one_correction" ON "public"."odontogram_entries" USING "btree" ("corrects_entry_id") WHERE ("corrects_entry_id" IS NOT NULL);
CREATE INDEX "odontogram_entries_patient_idx" ON "public"."odontogram_entries" USING "btree" ("patient_id", "created_at");
CREATE INDEX "patient_medical_history_clinic_id_idx" ON "public"."patient_medical_history" USING "btree" ("clinic_id");
CREATE INDEX "patient_medical_history_updated_by_idx" ON "public"."patient_medical_history" USING "btree" ("updated_by");
CREATE INDEX "patients_archived_by_idx" ON "public"."patients" USING "btree" ("archived_by");
CREATE INDEX "patients_clinic_id_idx" ON "public"."patients" USING "btree" ("clinic_id");
CREATE INDEX "patients_created_by_idx" ON "public"."patients" USING "btree" ("created_by");
CREATE INDEX "prescription_items_clinic_id_idx" ON "public"."prescription_items" USING "btree" ("clinic_id");
CREATE INDEX "prescription_items_patient_idx" ON "public"."prescription_items" USING "btree" ("patient_id");
CREATE INDEX "prescriptions_appointment_idx" ON "public"."prescriptions" USING "btree" ("appointment_id");
CREATE INDEX "prescriptions_clinic_id_idx" ON "public"."prescriptions" USING "btree" ("clinic_id");
CREATE INDEX "prescriptions_doctor_idx" ON "public"."prescriptions" USING "btree" ("doctor_id");
CREATE INDEX "prescriptions_encounter_idx" ON "public"."prescriptions" USING "btree" ("encounter_id");
CREATE INDEX "prescriptions_patient_idx" ON "public"."prescriptions" USING "btree" ("patient_id", "created_at");
CREATE INDEX "prescriptions_voided_by_idx" ON "public"."prescriptions" USING "btree" ("voided_by");
CREATE INDEX "profiles_clinic_id_idx" ON "public"."profiles" USING "btree" ("clinic_id");
CREATE INDEX "profiles_deactivated_by_idx" ON "public"."profiles" USING "btree" ("deactivated_by");
CREATE INDEX "queue_appointment_id_idx" ON "public"."queue" USING "btree" ("appointment_id");
CREATE INDEX "queue_clinic_id_idx" ON "public"."queue" USING "btree" ("clinic_id");
CREATE INDEX "queue_doctor_date_idx" ON "public"."queue" USING "btree" ("doctor_id", "queue_date");
CREATE INDEX "queue_patient_idx" ON "public"."queue" USING "btree" ("patient_id");
CREATE INDEX "treatment_plan_items_cancelled_by_idx" ON "public"."treatment_plan_items" USING "btree" ("cancelled_by");
CREATE INDEX "treatment_plan_items_clinic_id_idx" ON "public"."treatment_plan_items" USING "btree" ("clinic_id");
CREATE INDEX "treatment_plan_items_completed_by_idx" ON "public"."treatment_plan_items" USING "btree" ("completed_by");
CREATE INDEX "treatment_plan_items_created_by_idx" ON "public"."treatment_plan_items" USING "btree" ("created_by");
CREATE INDEX "treatment_plan_items_patient_idx" ON "public"."treatment_plan_items" USING "btree" ("patient_id", "created_at");
CREATE INDEX "vital_signs_appointment_idx" ON "public"."vital_signs" USING "btree" ("appointment_id");
CREATE INDEX "vital_signs_author_idx" ON "public"."vital_signs" USING "btree" ("author_id");
CREATE INDEX "vital_signs_clinic_id_idx" ON "public"."vital_signs" USING "btree" ("clinic_id");
CREATE INDEX "vital_signs_corrects_idx" ON "public"."vital_signs" USING "btree" ("corrects_entry_id");
CREATE INDEX "vital_signs_encounter_idx" ON "public"."vital_signs" USING "btree" ("encounter_id");
CREATE INDEX "vital_signs_patient_idx" ON "public"."vital_signs" USING "btree" ("patient_id", "created_at");
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."ai_consents" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."ai_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."ai_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."billing_charges" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."clinical_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."doctor_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."doctor_time_off" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."encounters" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."odontogram_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."patient_medical_history" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."prescription_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."queue" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."treatment_plan_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a0_set_clinic_id" BEFORE INSERT OR UPDATE ON "public"."vital_signs" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinic_id"();
CREATE OR REPLACE TRIGGER "a1_billing_payments_receipt" BEFORE INSERT ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."assign_receipt_number"();
CREATE OR REPLACE TRIGGER "a1_patients_record_number" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."assign_record_number"();
CREATE OR REPLACE TRIGGER "a2_appointments_stamp_created" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_created"();
CREATE OR REPLACE TRIGGER "a2_patients_stamp_created" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_created"();
CREATE OR REPLACE TRIGGER "ai_consents_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."ai_consents" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "ai_consents_stamp" BEFORE INSERT ON "public"."ai_consents" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_ai_consent"();
CREATE OR REPLACE TRIGGER "ai_drafts_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."ai_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "ai_drafts_stamp" BEFORE INSERT OR UPDATE ON "public"."ai_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_ai_draft"();
CREATE OR REPLACE TRIGGER "ai_sessions_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."ai_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "ai_sessions_stamp" BEFORE INSERT OR UPDATE ON "public"."ai_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_ai_session"();
CREATE OR REPLACE TRIGGER "appointments_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "appointments_doctor_update_guard" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_doctor_appointment_update"();
CREATE OR REPLACE TRIGGER "appointments_schedule_guard" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_appointment_schedule"();
CREATE OR REPLACE TRIGGER "appointments_slot_overlap_guard" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_appointment_no_overlap"();
CREATE OR REPLACE TRIGGER "appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "b_check_encounter" BEFORE INSERT OR UPDATE ON "public"."clinical_entries" FOR EACH ROW EXECUTE FUNCTION "public"."check_encounter_link"();
CREATE OR REPLACE TRIGGER "b_check_encounter" BEFORE INSERT OR UPDATE ON "public"."odontogram_entries" FOR EACH ROW EXECUTE FUNCTION "public"."check_encounter_link"();
CREATE OR REPLACE TRIGGER "b_check_encounter" BEFORE INSERT OR UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."check_encounter_link"();
CREATE OR REPLACE TRIGGER "b_check_encounter" BEFORE INSERT OR UPDATE ON "public"."vital_signs" FOR EACH ROW EXECUTE FUNCTION "public"."check_encounter_link"();
CREATE OR REPLACE TRIGGER "billing_charges_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."billing_charges" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "billing_charges_stamp" BEFORE INSERT OR UPDATE ON "public"."billing_charges" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_billing_charge"();
CREATE OR REPLACE TRIGGER "billing_payments_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "billing_payments_stamp" BEFORE INSERT OR UPDATE ON "public"."billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_billing_payment"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."ai_consents" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."ai_drafts" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."ai_sessions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."appointments" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."audit_log" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."billing_charges" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."billing_payments" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."clinical_entries" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."clinics" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."doctor_schedules" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."doctor_time_off" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."encounters" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."odontogram_entries" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."patient_medical_history" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."patients" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."prescription_items" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."prescriptions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."profiles" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."queue" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."treatment_plan_items" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "block_truncate" BEFORE TRUNCATE ON "public"."vital_signs" FOR EACH STATEMENT EXECUTE FUNCTION "public"."block_truncate"();
CREATE OR REPLACE TRIGGER "clinical_entries_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."clinical_entries" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "clinical_entries_stamp" BEFORE INSERT ON "public"."clinical_entries" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_clinical_entry"();
CREATE OR REPLACE TRIGGER "clinics_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "doctor_schedules_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."doctor_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "doctor_schedules_stamp" BEFORE INSERT OR UPDATE ON "public"."doctor_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_doctor_schedule"();
CREATE OR REPLACE TRIGGER "doctor_time_off_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."doctor_time_off" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "doctor_time_off_stamp" BEFORE INSERT OR UPDATE ON "public"."doctor_time_off" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_doctor_time_off"();
CREATE OR REPLACE TRIGGER "encounters_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."encounters" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "encounters_stamp" BEFORE INSERT OR UPDATE ON "public"."encounters" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_encounter"();
CREATE OR REPLACE TRIGGER "odontogram_entries_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."odontogram_entries" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "odontogram_entries_stamp" BEFORE INSERT ON "public"."odontogram_entries" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_odontogram_entry"();
CREATE OR REPLACE TRIGGER "patient_medical_history_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."patient_medical_history" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "patient_medical_history_stamp" BEFORE INSERT OR UPDATE ON "public"."patient_medical_history" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_medical_history"();
CREATE OR REPLACE TRIGGER "patients_archive_stamp" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_patient_archive"();
CREATE OR REPLACE TRIGGER "patients_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "prescription_items_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."prescription_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "prescription_items_stamp" BEFORE INSERT ON "public"."prescription_items" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_prescription_item"();
CREATE OR REPLACE TRIGGER "prescriptions_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "prescriptions_stamp" BEFORE INSERT OR UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_prescription"();
CREATE OR REPLACE TRIGGER "profiles_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "profiles_stamp" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_profile"();
CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "queue_assign_position" BEFORE INSERT ON "public"."queue" FOR EACH ROW EXECUTE FUNCTION "public"."assign_queue_position"();
CREATE OR REPLACE TRIGGER "queue_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."queue" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "queue_stamp" BEFORE INSERT OR UPDATE ON "public"."queue" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_queue"();
CREATE OR REPLACE TRIGGER "treatment_plan_items_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."treatment_plan_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "treatment_plan_items_stamp" BEFORE INSERT OR UPDATE ON "public"."treatment_plan_items" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_treatment_plan_item"();
CREATE OR REPLACE TRIGGER "vital_signs_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."vital_signs" FOR EACH ROW EXECUTE FUNCTION "public"."audit_row"();
CREATE OR REPLACE TRIGGER "vital_signs_stamp" BEFORE INSERT ON "public"."vital_signs" FOR EACH ROW EXECUTE FUNCTION "public"."stamp_vital_signs"();
ALTER TABLE ONLY "public"."ai_consents"
    ADD CONSTRAINT "ai_consents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."ai_consents"
    ADD CONSTRAINT "ai_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_consents"
    ADD CONSTRAINT "ai_consents_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_drafts"
    ADD CONSTRAINT "ai_drafts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_sessions"
    ADD CONSTRAINT "ai_sessions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."ai_sessions"
    ADD CONSTRAINT "ai_sessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_sessions"
    ADD CONSTRAINT "ai_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."ai_sessions"
    ADD CONSTRAINT "ai_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_treatment_plan_item_id_fkey" FOREIGN KEY ("treatment_plan_item_id") REFERENCES "public"."treatment_plan_items"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."billing_charges"
    ADD CONSTRAINT "billing_charges_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."billing_payments"
    ADD CONSTRAINT "billing_payments_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."clinic_counters"
    ADD CONSTRAINT "clinic_counters_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_corrects_entry_id_fkey" FOREIGN KEY ("corrects_entry_id") REFERENCES "public"."clinical_entries"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."clinical_entries"
    ADD CONSTRAINT "clinical_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."doctor_schedules"
    ADD CONSTRAINT "doctor_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."doctor_time_off"
    ADD CONSTRAINT "doctor_time_off_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."doctor_time_off"
    ADD CONSTRAINT "doctor_time_off_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."doctor_time_off"
    ADD CONSTRAINT "doctor_time_off_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."doctor_time_off"
    ADD CONSTRAINT "doctor_time_off_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."encounters"
    ADD CONSTRAINT "encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_corrects_entry_id_fkey" FOREIGN KEY ("corrects_entry_id") REFERENCES "public"."odontogram_entries"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."odontogram_entries"
    ADD CONSTRAINT "odontogram_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."treatment_plan_items"
    ADD CONSTRAINT "treatment_plan_items_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_corrects_entry_id_fkey" FOREIGN KEY ("corrects_entry_id") REFERENCES "public"."vital_signs"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."vital_signs"
    ADD CONSTRAINT "vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."ai_consents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_consents: registrar" ON "public"."ai_consents" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_consents"."patient_id")))));
CREATE POLICY "ai_consents: ver" ON "public"."ai_consents" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_consents"."patient_id")))));
ALTER TABLE "public"."ai_drafts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_drafts: decidir" ON "public"."ai_drafts" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_drafts"."patient_id"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_drafts"."patient_id")))));
CREATE POLICY "ai_drafts: proponer" ON "public"."ai_drafts" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_drafts"."patient_id")))));
CREATE POLICY "ai_drafts: ver" ON "public"."ai_drafts" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_drafts"."patient_id")))));
ALTER TABLE "public"."ai_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_sessions: dueño registra consumo" ON "public"."ai_sessions" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "ai_sessions: iniciar" ON "public"."ai_sessions" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_sessions"."patient_id")))));
CREATE POLICY "ai_sessions: ver" ON "public"."ai_sessions" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "ai_sessions"."patient_id")))));
CREATE POLICY "aislamiento por clínica" ON "public"."ai_consents" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."ai_drafts" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."ai_sessions" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."appointments" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."audit_log" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."billing_charges" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."billing_payments" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."clinical_entries" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."doctor_schedules" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."doctor_time_off" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."encounters" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."odontogram_entries" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."patient_medical_history" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."patients" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."prescription_items" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."prescriptions" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."profiles" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."queue" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."treatment_plan_items" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
CREATE POLICY "aislamiento por clínica" ON "public"."vital_signs" AS RESTRICTIVE TO "authenticated" USING (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic"))) WITH CHECK (("clinic_id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments: admin y recepción gestionan" ON "public"."appointments" TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"]))) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])));
CREATE POLICY "appointments: doctor actualiza sus citas" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "appointments: doctor ve sus citas" ON "public"."appointments" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "appointments: enfermeria ve citas" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'enfermeria'::"public"."user_role"));
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log: ver" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'admin'::"public"."user_role") OR ((EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "audit_log"."patient_id"))) AND
CASE
    WHEN ("table_name" = ANY (ARRAY['billing_charges'::"text", 'billing_payments'::"text"])) THEN (( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['recepcion'::"public"."user_role", 'doctor'::"public"."user_role"]))
    WHEN ("table_name" = ANY (ARRAY['appointments'::"text", 'queue'::"text"])) THEN ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['recepcion'::"public"."user_role", 'enfermeria'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (((COALESCE("new_data", "old_data") ->> 'doctor_id'::"text"))::"uuid" = ( SELECT "auth"."uid"() AS "uid"))))
    ELSE true
END)));
ALTER TABLE "public"."billing_charges" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_charges: anular o reclamar" ON "public"."billing_charges" FOR UPDATE TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"]))) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])));
CREATE POLICY "billing_charges: registrar" ON "public"."billing_charges" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "billing_charges"."patient_id")))));
CREATE POLICY "billing_charges: ver" ON "public"."billing_charges" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "billing_charges"."patient_id"))))));
ALTER TABLE "public"."billing_payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_payments: anular" ON "public"."billing_payments" FOR UPDATE TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"]))) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])));
CREATE POLICY "billing_payments: registrar" ON "public"."billing_payments" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "billing_payments"."patient_id")))));
CREATE POLICY "billing_payments: ver" ON "public"."billing_payments" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "billing_payments"."patient_id"))))));
ALTER TABLE "public"."clinic_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinical_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_entries: registrar" ON "public"."clinical_entries" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (("kind" <> 'medicamento'::"public"."clinical_entry_kind") OR (( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role")) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "clinical_entries"."patient_id")))));
CREATE POLICY "clinical_entries: ver" ON "public"."clinical_entries" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "clinical_entries"."patient_id")))));
ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics: admin edita la suya" ON "public"."clinics" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")) AND (( SELECT "public"."get_my_role"() AS "get_my_role") = 'admin'::"public"."user_role"))) WITH CHECK ((("id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")) AND (( SELECT "public"."get_my_role"() AS "get_my_role") = 'admin'::"public"."user_role")));
CREATE POLICY "clinics: ver la mía" ON "public"."clinics" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "public"."get_my_clinic"() AS "get_my_clinic")));
ALTER TABLE "public"."doctor_schedules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_schedules: desactivar" ON "public"."doctor_schedules" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))));
CREATE POLICY "doctor_schedules: registrar" ON "public"."doctor_schedules" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))));
CREATE POLICY "doctor_schedules: ver" ON "public"."doctor_schedules" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") IS NOT NULL));
ALTER TABLE "public"."doctor_time_off" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_time_off: anular" ON "public"."doctor_time_off" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))));
CREATE POLICY "doctor_time_off: registrar" ON "public"."doctor_time_off" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])) OR ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))));
CREATE POLICY "doctor_time_off: ver" ON "public"."doctor_time_off" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") IS NOT NULL));
ALTER TABLE "public"."encounters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "encounters: abrir" ON "public"."encounters" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "encounters"."patient_id")))));
CREATE POLICY "encounters: doctor cierra" ON "public"."encounters" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "encounters"."patient_id"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "encounters"."patient_id")))));
CREATE POLICY "encounters: ver" ON "public"."encounters" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "encounters"."patient_id")))));
CREATE POLICY "medical_history: actualizar" ON "public"."patient_medical_history" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "patient_medical_history"."patient_id"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "patient_medical_history"."patient_id")))));
CREATE POLICY "medical_history: registrar" ON "public"."patient_medical_history" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "patient_medical_history"."patient_id")))));
CREATE POLICY "medical_history: ver" ON "public"."patient_medical_history" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "patient_medical_history"."patient_id")))));
ALTER TABLE "public"."odontogram_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odontogram_entries: registrar" ON "public"."odontogram_entries" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "odontogram_entries"."patient_id")))));
CREATE POLICY "odontogram_entries: ver" ON "public"."odontogram_entries" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "odontogram_entries"."patient_id")))));
ALTER TABLE "public"."patient_medical_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients: admin y recepción gestionan" ON "public"."patients" TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"]))) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])));
CREATE POLICY "patients: doctor ve sus pacientes" ON "public"."patients" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ((EXISTS ( SELECT 1
   FROM "public"."appointments" "a"
  WHERE (("a"."patient_id" = "patients"."id") AND ("a"."doctor_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."queue" "q"
  WHERE (("q"."patient_id" = "patients"."id") AND ("q"."doctor_id" = ( SELECT "auth"."uid"() AS "uid"))))))));
CREATE POLICY "patients: enfermeria crea pacientes" ON "public"."patients" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'enfermeria'::"public"."user_role"));
CREATE POLICY "patients: enfermeria ve pacientes" ON "public"."patients" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'enfermeria'::"public"."user_role"));
ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prescription_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescription_items: doctor agrega" ON "public"."prescription_items" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role"));
CREATE POLICY "prescription_items: ver" ON "public"."prescription_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescriptions" "r"
  WHERE ("r"."id" = "prescription_items"."prescription_id"))));
ALTER TABLE "public"."prescriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescriptions: doctor anula la suya" ON "public"."prescriptions" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "prescriptions: doctor receta" ON "public"."prescriptions" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "prescriptions"."patient_id")))));
CREATE POLICY "prescriptions: ver" ON "public"."prescriptions" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "prescriptions"."patient_id")))));
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: admin gestiona" ON "public"."profiles" TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'admin'::"public"."user_role")) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'admin'::"public"."user_role"));
CREATE POLICY "profiles: ver (activos)" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") IS NOT NULL));
CREATE POLICY "profiles: ver el mío" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));
ALTER TABLE "public"."queue" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue: admin y recepción gestionan" ON "public"."queue" TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"]))) WITH CHECK ((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role"])));
CREATE POLICY "queue: doctor actualiza sus turnos" ON "public"."queue" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "queue: doctor ve sus turnos" ON "public"."queue" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND ("doctor_id" = ( SELECT "auth"."uid"() AS "uid"))));
CREATE POLICY "queue: enfermeria ve turnos" ON "public"."queue" FOR SELECT TO "authenticated" USING ((( SELECT "public"."get_my_role"() AS "get_my_role") = 'enfermeria'::"public"."user_role"));
ALTER TABLE "public"."treatment_plan_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treatment_plan_items: doctor cambia estado" ON "public"."treatment_plan_items" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "treatment_plan_items"."patient_id"))))) WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "treatment_plan_items"."patient_id")))));
CREATE POLICY "treatment_plan_items: doctor registra" ON "public"."treatment_plan_items" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = 'doctor'::"public"."user_role") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "treatment_plan_items"."patient_id")))));
CREATE POLICY "treatment_plan_items: ver" ON "public"."treatment_plan_items" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "treatment_plan_items"."patient_id")))));
ALTER TABLE "public"."vital_signs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vital_signs: registrar" ON "public"."vital_signs" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "vital_signs"."patient_id")))));
CREATE POLICY "vital_signs: ver" ON "public"."vital_signs" FOR SELECT TO "authenticated" USING (((( SELECT "public"."get_my_role"() AS "get_my_role") = ANY (ARRAY['admin'::"public"."user_role", 'recepcion'::"public"."user_role", 'doctor'::"public"."user_role", 'enfermeria'::"public"."user_role"])) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE ("p"."id" = "vital_signs"."patient_id")))));
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
REVOKE ALL ON FUNCTION "public"."ai_consent_active"("p_patient" "uuid", "p_scope" "public"."ai_consent_scope") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ai_consent_active"("p_patient" "uuid", "p_scope" "public"."ai_consent_scope") TO "service_role";
GRANT ALL ON FUNCTION "public"."ai_consent_active"("p_patient" "uuid", "p_scope" "public"."ai_consent_scope") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."appointment_range"("p_starts_at" timestamp with time zone, "p_duration_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."appointment_range"("p_starts_at" timestamp with time zone, "p_duration_minutes" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."appointment_range"("p_starts_at" timestamp with time zone, "p_duration_minutes" integer) TO "authenticated";
REVOKE ALL ON FUNCTION "public"."assign_queue_position"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_queue_position"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."assign_receipt_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_receipt_number"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."assign_record_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_record_number"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."audit_row"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_row"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."block_truncate"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."block_truncate"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."check_encounter_link"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_encounter_link"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."create_prescription"("p_patient_id" "uuid", "p_items" "jsonb", "p_indications" "text", "p_appointment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_prescription"("p_patient_id" "uuid", "p_items" "jsonb", "p_indications" "text", "p_appointment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_prescription"("p_patient_id" "uuid", "p_items" "jsonb", "p_indications" "text", "p_appointment_id" "uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."enforce_appointment_no_overlap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_appointment_no_overlap"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."enforce_appointment_schedule"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_appointment_schedule"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."enforce_doctor_appointment_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_doctor_appointment_update"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."ensure_profile_for_user"("p_user" "auth"."users") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_profile_for_user"("p_user" "auth"."users") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_my_clinic"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_clinic"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_clinic"() TO "authenticated";
REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
REVOKE ALL ON FUNCTION "public"."mfa_satisfied"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mfa_satisfied"() TO "service_role";
GRANT ALL ON FUNCTION "public"."mfa_satisfied"() TO "authenticated";
REVOKE ALL ON FUNCTION "public"."next_clinic_number"("p_clinic" "uuid", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_clinic_number"("p_clinic" "uuid", "p_name" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."patients_for_review"("p_cutoff" timestamp with time zone, "p_now" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."patients_for_review"("p_cutoff" timestamp with time zone, "p_now" timestamp with time zone, "p_limit" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."patients_for_review"("p_cutoff" timestamp with time zone, "p_now" timestamp with time zone, "p_limit" integer) TO "authenticated";
REVOKE ALL ON FUNCTION "public"."platform_assign_first_admin"("p_user" "uuid", "p_clinic" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_assign_first_admin"("p_user" "uuid", "p_clinic" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."platform_assign_first_admin"("p_user" "uuid", "p_clinic" "uuid") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."platform_create_clinic"("p_name" "text", "p_address" "text", "p_phone" "text", "p_tax_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_create_clinic"("p_name" "text", "p_address" "text", "p_phone" "text", "p_tax_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."platform_create_clinic"("p_name" "text", "p_address" "text", "p_phone" "text", "p_tax_id" "text") TO "authenticated";
REVOKE ALL ON FUNCTION "public"."platform_list_clinics"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_list_clinics"() TO "service_role";
GRANT ALL ON FUNCTION "public"."platform_list_clinics"() TO "authenticated";
REVOKE ALL ON FUNCTION "public"."platform_set_clinic_active"("p_clinic" "uuid", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_set_clinic_active"("p_clinic" "uuid", "p_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."platform_set_clinic_active"("p_clinic" "uuid", "p_active" boolean) TO "authenticated";
REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."set_clinic_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_clinic_id"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_ai_consent"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_ai_consent"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_ai_draft"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_ai_draft"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_ai_session"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_ai_session"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_billing_charge"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_billing_charge"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_billing_payment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_billing_payment"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_clinical_entry"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_clinical_entry"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_created"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_doctor_schedule"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_doctor_schedule"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_doctor_time_off"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_doctor_time_off"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_encounter"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_encounter"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_medical_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_medical_history"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_odontogram_entry"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_odontogram_entry"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_patient_archive"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_patient_archive"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_prescription"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_prescription"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_prescription_item"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_prescription_item"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_profile"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_queue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_queue"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_treatment_plan_item"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_treatment_plan_item"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."stamp_vital_signs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."stamp_vital_signs"() TO "service_role";
GRANT ALL ON TABLE "public"."ai_consents" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."ai_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_drafts" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ai_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_sessions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ai_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";
GRANT SELECT ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."billing_charges" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."billing_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_payments" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."billing_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_counters" TO "service_role";
GRANT ALL ON TABLE "public"."clinical_entries" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."clinical_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";
GRANT SELECT ON TABLE "public"."clinics" TO "authenticated";
GRANT UPDATE("name") ON TABLE "public"."clinics" TO "authenticated";
GRANT UPDATE("address") ON TABLE "public"."clinics" TO "authenticated";
GRANT UPDATE("phone") ON TABLE "public"."clinics" TO "authenticated";
GRANT UPDATE("tax_id") ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_schedules" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."doctor_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_time_off" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."doctor_time_off" TO "authenticated";
GRANT ALL ON TABLE "public"."encounters" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."encounters" TO "authenticated";
GRANT ALL ON TABLE "public"."odontogram_entries" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."odontogram_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_medical_history" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."patient_medical_history" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";
GRANT ALL ON TABLE "public"."prescription_items" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."prescription_items" TO "authenticated";
GRANT ALL ON TABLE "public"."prescriptions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."queue" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."queue" TO "authenticated";
GRANT ALL ON TABLE "public"."treatment_plan_items" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."treatment_plan_items" TO "authenticated";
GRANT ALL ON TABLE "public"."vital_signs" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."vital_signs" TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
