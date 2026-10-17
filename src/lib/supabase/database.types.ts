// Generado con `npm run db:types` desde las migraciones. No editar a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_consents": {
                  Row: {
                    "clinic_id": string,"granted": boolean,"id": string,"note": string | null,"patient_id": string,"recorded_at": string,"recorded_by": string | null,"scope": Database["public"]['Enums']["ai_consent_scope"]
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"granted": boolean,"id"?: string,"note"?: string | null,"patient_id": string,"recorded_at"?: string,"recorded_by"?: string | null,"scope": Database["public"]['Enums']["ai_consent_scope"]
                  }
                  Update: {
                    "clinic_id"?: string,"granted"?: boolean,"id"?: string,"note"?: string | null,"patient_id"?: string,"recorded_at"?: string,"recorded_by"?: string | null,"scope"?: Database["public"]['Enums']["ai_consent_scope"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_consents_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_consents_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_consents_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_drafts": {
                  Row: {
                    "accepted_record_id": string | null,"clinic_id": string,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"encounter_id": string,"id": string,"kind": Database["public"]['Enums']["ai_draft_kind"],"patient_id": string,"payload": NonNullable<Json>,"session_id": string,"status": Database["public"]['Enums']["ai_draft_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_record_id"?: string | null,"clinic_id": string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"encounter_id": string,"id"?: string,"kind": Database["public"]['Enums']["ai_draft_kind"],"patient_id": string,"payload": NonNullable<Json>,"session_id": string,"status"?: Database["public"]['Enums']["ai_draft_status"]
                  }
                  Update: {
                    "accepted_record_id"?: string | null,"clinic_id"?: string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"encounter_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["ai_draft_kind"],"patient_id"?: string,"payload"?: NonNullable<Json>,"session_id"?: string,"status"?: Database["public"]['Enums']["ai_draft_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_drafts_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_drafts_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_drafts_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_drafts_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_drafts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "ai_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_sessions": {
                  Row: {
                    "cache_read_tokens": number,"cache_write_tokens": number,"clinic_id": string,"cost_usd": number,"encounter_id": string,"ended_at": string | null,"id": string,"input_tokens": number,"model": string,"output_tokens": number,"patient_id": string,"started_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"clinic_id": string,"cost_usd"?: number,"encounter_id": string,"ended_at"?: string | null,"id"?: string,"input_tokens"?: number,"model": string,"output_tokens"?: number,"patient_id": string,"started_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"clinic_id"?: string,"cost_usd"?: number,"encounter_id"?: string,"ended_at"?: string | null,"id"?: string,"input_tokens"?: number,"model"?: string,"output_tokens"?: number,"patient_id"?: string,"started_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_sessions_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_sessions_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_sessions_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "clinic_id": string,"created_at": string,"doctor_id": string,"duration_minutes": number,"id": string,"patient_id": string,"reason": string | null,"starts_at": string,"status": Database["public"]['Enums']["appointment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"created_at"?: string,"doctor_id": string,"duration_minutes"?: number,"id"?: string,"patient_id": string,"reason"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Update: {
                    "clinic_id"?: string,"created_at"?: string,"doctor_id"?: string,"duration_minutes"?: number,"id"?: string,"patient_id"?: string,"reason"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"chain_seq": number | null,"changed_at": string,"changed_by": string | null,"clinic_id": string,"id": number,"new_data": Json | null,"old_data": Json | null,"patient_id": string | null,"prev_hash": string | null,"record_id": string,"row_hash": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"chain_seq"?: number | null,"changed_at"?: string,"changed_by"?: string | null,"clinic_id": string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"patient_id"?: string | null,"prev_hash"?: string | null,"record_id": string,"row_hash"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"chain_seq"?: number | null,"changed_at"?: string,"changed_by"?: string | null,"clinic_id"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"patient_id"?: string | null,"prev_hash"?: string | null,"record_id"?: string,"row_hash"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    }
                  ]
                },"billing_charges": {
                  Row: {
                    "amount": number,"ars_authorization": string | null,"ars_coverage": number,"ars_name": string | null,"ars_status": Database["public"]['Enums']["ars_claim_status"],"clinic_id": string,"created_at": string,"created_by": string | null,"description": string,"id": string,"patient_amount": number | null,"patient_id": string,"treatment_plan_item_id": string | null,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"ars_authorization"?: string | null,"ars_coverage"?: number,"ars_name"?: string | null,"ars_status"?: Database["public"]['Enums']["ars_claim_status"],"clinic_id": string,"created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"patient_amount"?: never,"patient_id": string,"treatment_plan_item_id"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"ars_authorization"?: string | null,"ars_coverage"?: number,"ars_name"?: string | null,"ars_status"?: Database["public"]['Enums']["ars_claim_status"],"clinic_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"patient_amount"?: never,"patient_id"?: string,"treatment_plan_item_id"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_charges_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_charges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_charges_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_charges_treatment_plan_item_id_fkey"
      columns: ["treatment_plan_item_id"]
isOneToOne: false
      referencedRelation: "treatment_plan_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_charges_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"billing_payments": {
                  Row: {
                    "amount": number,"clinic_id": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"patient_id": string,"receipt_number": number,"received_at": string,"received_by": string | null,"reference": string | null,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"clinic_id": string,"id"?: string,"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"patient_id": string,"receipt_number": number,"received_at"?: string,"received_by"?: string | null,"reference"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"clinic_id"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"patient_id"?: string,"receipt_number"?: number,"received_at"?: string,"received_by"?: string | null,"reference"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_payments_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_payments_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clinic_counters": {
                  Row: {
                    "clinic_id": string,"name": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"name": string,"value"?: number
                  }
                  Update: {
                    "clinic_id"?: string,"name"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinic_counters_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    }
                  ]
                },"clinical_entries": {
                  Row: {
                    "administered_at": string | null,"author_id": string | null,"author_role": Database["public"]['Enums']["user_role"] | null,"body": string | null,"clinic_id": string,"correction_reason": string | null,"corrects_entry_id": string | null,"created_at": string,"dose": string | null,"encounter_id": string | null,"id": string,"kind": Database["public"]['Enums']["clinical_entry_kind"],"medication_name": string | null,"patient_id": string,"route": string | null,"source": Database["public"]['Enums']["record_source"]
                  }
                  ComputedFields: never
                  Insert: {
                    "administered_at"?: string | null,"author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"body"?: string | null,"clinic_id": string,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"dose"?: string | null,"encounter_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["clinical_entry_kind"],"medication_name"?: string | null,"patient_id": string,"route"?: string | null,"source"?: Database["public"]['Enums']["record_source"]
                  }
                  Update: {
                    "administered_at"?: string | null,"author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"body"?: string | null,"clinic_id"?: string,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"dose"?: string | null,"encounter_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["clinical_entry_kind"],"medication_name"?: string | null,"patient_id"?: string,"route"?: string | null,"source"?: Database["public"]['Enums']["record_source"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinical_entries_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_entries_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_entries_corrects_entry_id_fkey"
      columns: ["corrects_entry_id"]
isOneToOne: false
      referencedRelation: "clinical_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_entries_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_entries_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"clinics": {
                  Row: {
                    "active": boolean,"address": string | null,"created_at": string,"id": string,"name": string,"phone": string | null,"tax_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"name": string,"phone"?: string | null,"tax_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"tax_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"data_subject_requests": {
                  Row: {
                    "channel": string,"clinic_id": string,"details": string | null,"id": string,"patient_id": string,"received_at": string,"received_by": string | null,"request_type": string,"requested_by": string,"resolved_at": string | null,"resolved_by": string | null,"response_note": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"clinic_id": string,"details"?: string | null,"id"?: string,"patient_id": string,"received_at"?: string,"received_by"?: string | null,"request_type": string,"requested_by": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"response_note"?: string | null,"status"?: string
                  }
                  Update: {
                    "channel"?: string,"clinic_id"?: string,"details"?: string | null,"id"?: string,"patient_id"?: string,"received_at"?: string,"received_by"?: string | null,"request_type"?: string,"requested_by"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"response_note"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_subject_requests_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "data_subject_requests_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "data_subject_requests_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "data_subject_requests_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_schedules": {
                  Row: {
                    "active": boolean,"clinic_id": string,"created_at": string,"created_by": string | null,"deactivated_at": string | null,"deactivated_by": string | null,"doctor_id": string,"end_time": string,"id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"clinic_id": string,"created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"doctor_id": string,"end_time": string,"id"?: string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "active"?: boolean,"clinic_id"?: string,"created_at"?: string,"created_by"?: string | null,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"doctor_id"?: string,"end_time"?: string,"id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_schedules_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_schedules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_schedules_deactivated_by_fkey"
      columns: ["deactivated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_schedules_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_time_off": {
                  Row: {
                    "clinic_id": string,"created_at": string,"created_by": string | null,"doctor_id": string,"ends_on": string,"id": string,"reason": string,"starts_on": string,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"created_at"?: string,"created_by"?: string | null,"doctor_id": string,"ends_on": string,"id"?: string,"reason": string,"starts_on": string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "clinic_id"?: string,"created_at"?: string,"created_by"?: string | null,"doctor_id"?: string,"ends_on"?: string,"id"?: string,"reason"?: string,"starts_on"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_time_off_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_time_off_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_time_off_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_time_off_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"encounters": {
                  Row: {
                    "appointment_id": string | null,"clinic_id": string,"closed_at": string | null,"closed_by": string | null,"closure_note": string | null,"id": string,"opened_at": string,"opened_by": string | null,"opened_by_role": Database["public"]['Enums']["user_role"] | null,"patient_id": string,"reason": string | null,"status": Database["public"]['Enums']["encounter_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"clinic_id": string,"closed_at"?: string | null,"closed_by"?: string | null,"closure_note"?: string | null,"id"?: string,"opened_at"?: string,"opened_by"?: string | null,"opened_by_role"?: Database["public"]['Enums']["user_role"] | null,"patient_id": string,"reason"?: string | null,"status"?: Database["public"]['Enums']["encounter_status"]
                  }
                  Update: {
                    "appointment_id"?: string | null,"clinic_id"?: string,"closed_at"?: string | null,"closed_by"?: string | null,"closure_note"?: string | null,"id"?: string,"opened_at"?: string,"opened_by"?: string | null,"opened_by_role"?: Database["public"]['Enums']["user_role"] | null,"patient_id"?: string,"reason"?: string | null,"status"?: Database["public"]['Enums']["encounter_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "encounters_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_opened_by_fkey"
      columns: ["opened_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encounters_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"odontogram_entries": {
                  Row: {
                    "author_id": string | null,"author_role": Database["public"]['Enums']["user_role"] | null,"clinic_id": string,"condition": Database["public"]['Enums']["odontogram_condition"] | null,"correction_reason": string | null,"corrects_entry_id": string | null,"created_at": string,"encounter_id": string | null,"id": string,"note": string | null,"patient_id": string,"source": Database["public"]['Enums']["record_source"],"surfaces": (string)[] | null,"tooth": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"clinic_id": string,"condition"?: Database["public"]['Enums']["odontogram_condition"] | null,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"encounter_id"?: string | null,"id"?: string,"note"?: string | null,"patient_id": string,"source"?: Database["public"]['Enums']["record_source"],"surfaces"?: (string)[] | null,"tooth": number
                  }
                  Update: {
                    "author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"clinic_id"?: string,"condition"?: Database["public"]['Enums']["odontogram_condition"] | null,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"encounter_id"?: string | null,"id"?: string,"note"?: string | null,"patient_id"?: string,"source"?: Database["public"]['Enums']["record_source"],"surfaces"?: (string)[] | null,"tooth"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "odontogram_entries_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "odontogram_entries_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "odontogram_entries_corrects_entry_id_fkey"
      columns: ["corrects_entry_id"]
isOneToOne: false
      referencedRelation: "odontogram_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "odontogram_entries_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "odontogram_entries_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_guardians": {
                  Row: {
                    "can_consent": boolean,"clinic_id": string,"ended_at": string | null,"ended_by": string | null,"ended_reason": string | null,"full_name": string,"id": string,"id_document": string | null,"is_active": boolean,"patient_id": string,"phone": string | null,"recorded_at": string,"recorded_by": string | null,"relationship": string
                  }
                  ComputedFields: never
                  Insert: {
                    "can_consent"?: boolean,"clinic_id": string,"ended_at"?: string | null,"ended_by"?: string | null,"ended_reason"?: string | null,"full_name": string,"id"?: string,"id_document"?: string | null,"is_active"?: boolean,"patient_id": string,"phone"?: string | null,"recorded_at"?: string,"recorded_by"?: string | null,"relationship": string
                  }
                  Update: {
                    "can_consent"?: boolean,"clinic_id"?: string,"ended_at"?: string | null,"ended_by"?: string | null,"ended_reason"?: string | null,"full_name"?: string,"id"?: string,"id_document"?: string | null,"is_active"?: boolean,"patient_id"?: string,"phone"?: string | null,"recorded_at"?: string,"recorded_by"?: string | null,"relationship"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_guardians_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_guardians_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_guardians_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_guardians_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_medical_history": {
                  Row: {
                    "allergies_other": string | null,"allergy_latex": boolean,"allergy_local_anesthetic": boolean,"allergy_nsaids": boolean,"allergy_penicillin": boolean,"clinic_id": string,"conditions_other": string | null,"created_at": string,"current_medications": string | null,"has_diabetes": boolean,"has_heart_disease": boolean,"has_hypertension": boolean,"is_pregnant": boolean,"patient_id": string,"takes_anticoagulants": boolean,"takes_bisphosphonates": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "allergies_other"?: string | null,"allergy_latex"?: boolean,"allergy_local_anesthetic"?: boolean,"allergy_nsaids"?: boolean,"allergy_penicillin"?: boolean,"clinic_id": string,"conditions_other"?: string | null,"created_at"?: string,"current_medications"?: string | null,"has_diabetes"?: boolean,"has_heart_disease"?: boolean,"has_hypertension"?: boolean,"is_pregnant"?: boolean,"patient_id": string,"takes_anticoagulants"?: boolean,"takes_bisphosphonates"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "allergies_other"?: string | null,"allergy_latex"?: boolean,"allergy_local_anesthetic"?: boolean,"allergy_nsaids"?: boolean,"allergy_penicillin"?: boolean,"clinic_id"?: string,"conditions_other"?: string | null,"created_at"?: string,"current_medications"?: string | null,"has_diabetes"?: boolean,"has_heart_disease"?: boolean,"has_hypertension"?: boolean,"is_pregnant"?: boolean,"patient_id"?: string,"takes_anticoagulants"?: boolean,"takes_bisphosphonates"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_medical_history_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_medical_history_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: true
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_medical_history_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "affiliate_number": string | null,"archived_at": string | null,"archived_by": string | null,"archived_reason": string | null,"birth_date": string | null,"clinic_id": string,"created_at": string,"created_by": string | null,"document_id": string | null,"email": string | null,"full_name": string,"id": string,"insurance_provider": string | null,"insurance_type": Database["public"]['Enums']["insurance_type"] | null,"notes": string | null,"phone": string | null,"record_number": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "affiliate_number"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"archived_reason"?: string | null,"birth_date"?: string | null,"clinic_id": string,"created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"insurance_provider"?: string | null,"insurance_type"?: Database["public"]['Enums']["insurance_type"] | null,"notes"?: string | null,"phone"?: string | null,"record_number": number,"updated_at"?: string
                  }
                  Update: {
                    "affiliate_number"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"archived_reason"?: string | null,"birth_date"?: string | null,"clinic_id"?: string,"created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"insurance_provider"?: string | null,"insurance_type"?: Database["public"]['Enums']["insurance_type"] | null,"notes"?: string | null,"phone"?: string | null,"record_number"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patients_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patients_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patients_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"prescription_items": {
                  Row: {
                    "clinic_id": string,"dose": string | null,"duration": string | null,"frequency": string | null,"id": string,"instructions": string | null,"medication": string,"patient_id": string | null,"position": number,"prescription_id": string,"quantity": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"dose"?: string | null,"duration"?: string | null,"frequency"?: string | null,"id"?: string,"instructions"?: string | null,"medication": string,"patient_id"?: string | null,"position": number,"prescription_id": string,"quantity"?: string | null
                  }
                  Update: {
                    "clinic_id"?: string,"dose"?: string | null,"duration"?: string | null,"frequency"?: string | null,"id"?: string,"instructions"?: string | null,"medication"?: string,"patient_id"?: string | null,"position"?: number,"prescription_id"?: string,"quantity"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "prescription_items_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescription_items_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescription_items_prescription_id_fkey"
      columns: ["prescription_id"]
isOneToOne: false
      referencedRelation: "prescriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"prescriptions": {
                  Row: {
                    "appointment_id": string | null,"clinic_id": string,"created_at": string,"doctor_exequatur": string,"doctor_id": string | null,"doctor_name": string,"encounter_id": string | null,"id": string,"indications": string | null,"patient_id": string,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"clinic_id": string,"created_at"?: string,"doctor_exequatur"?: string,"doctor_id"?: string | null,"doctor_name"?: string,"encounter_id"?: string | null,"id"?: string,"indications"?: string | null,"patient_id": string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "appointment_id"?: string | null,"clinic_id"?: string,"created_at"?: string,"doctor_exequatur"?: string,"doctor_id"?: string | null,"doctor_name"?: string,"encounter_id"?: string | null,"id"?: string,"indications"?: string | null,"patient_id"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "prescriptions_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prescriptions_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"procedures_performed": {
                  Row: {
                    "clinic_id": string,"encounter_id": string,"id": string,"note": string | null,"odontogram_entry_id": string | null,"patient_id": string,"performed_at": string,"performed_by": string | null,"procedure": string,"surfaces": (string)[] | null,"tooth": number | null,"treatment_plan_item_id": string | null,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clinic_id": string,"encounter_id": string,"id"?: string,"note"?: string | null,"odontogram_entry_id"?: string | null,"patient_id": string,"performed_at"?: string,"performed_by"?: string | null,"procedure": string,"surfaces"?: (string)[] | null,"tooth"?: number | null,"treatment_plan_item_id"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "clinic_id"?: string,"encounter_id"?: string,"id"?: string,"note"?: string | null,"odontogram_entry_id"?: string | null,"patient_id"?: string,"performed_at"?: string,"performed_by"?: string | null,"procedure"?: string,"surfaces"?: (string)[] | null,"tooth"?: number | null,"treatment_plan_item_id"?: string | null,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "procedures_performed_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_odontogram_entry_id_fkey"
      columns: ["odontogram_entry_id"]
isOneToOne: true
      referencedRelation: "odontogram_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_performed_by_fkey"
      columns: ["performed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_treatment_plan_item_id_fkey"
      columns: ["treatment_plan_item_id"]
isOneToOne: false
      referencedRelation: "treatment_plan_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_performed_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"clinic_id": string,"created_at": string,"deactivated_at": string | null,"deactivated_by": string | null,"deactivated_reason": string | null,"exequatur": string | null,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"clinic_id": string,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"deactivated_reason"?: string | null,"exequatur"?: string | null,"full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"clinic_id"?: string,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"deactivated_reason"?: string | null,"exequatur"?: string | null,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    }
                  ]
                },"queue": {
                  Row: {
                    "appointment_id": string | null,"called_at": string | null,"checked_in_at": string,"clinic_id": string,"doctor_id": string | null,"finished_at": string | null,"id": string,"patient_id": string,"position": number,"queue_date": string,"status": Database["public"]['Enums']["queue_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"called_at"?: string | null,"checked_in_at"?: string,"clinic_id": string,"doctor_id"?: string | null,"finished_at"?: string | null,"id"?: string,"patient_id": string,"position": number,"queue_date"?: string,"status"?: Database["public"]['Enums']["queue_status"]
                  }
                  Update: {
                    "appointment_id"?: string | null,"called_at"?: string | null,"checked_in_at"?: string,"clinic_id"?: string,"doctor_id"?: string | null,"finished_at"?: string | null,"id"?: string,"patient_id"?: string,"position"?: number,"queue_date"?: string,"status"?: Database["public"]['Enums']["queue_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "queue_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_doctor_id_fkey"
      columns: ["doctor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "queue_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"treatment_plan_items": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"clinic_id": string,"completed_at": string | null,"completed_by": string | null,"created_at": string,"created_by": string | null,"estimated_cost": number | null,"id": string,"note": string | null,"patient_id": string,"procedure": string,"started_at": string | null,"status": Database["public"]['Enums']["treatment_status"],"surfaces": (string)[] | null,"tooth": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"clinic_id": string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"estimated_cost"?: number | null,"id"?: string,"note"?: string | null,"patient_id": string,"procedure": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["treatment_status"],"surfaces"?: (string)[] | null,"tooth"?: number | null
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"clinic_id"?: string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"estimated_cost"?: number | null,"id"?: string,"note"?: string | null,"patient_id"?: string,"procedure"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["treatment_status"],"surfaces"?: (string)[] | null,"tooth"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "treatment_plan_items_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "treatment_plan_items_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "treatment_plan_items_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "treatment_plan_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "treatment_plan_items_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"vital_signs": {
                  Row: {
                    "appointment_id": string | null,"author_id": string | null,"author_role": Database["public"]['Enums']["user_role"] | null,"clinic_id": string,"correction_reason": string | null,"corrects_entry_id": string | null,"created_at": string,"diastolic": number | null,"encounter_id": string | null,"glucose_mg_dl": number | null,"heart_rate": number | null,"id": string,"note": string | null,"oxygen_saturation": number | null,"patient_id": string,"source": Database["public"]['Enums']["record_source"],"systolic": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"clinic_id": string,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"diastolic"?: number | null,"encounter_id"?: string | null,"glucose_mg_dl"?: number | null,"heart_rate"?: number | null,"id"?: string,"note"?: string | null,"oxygen_saturation"?: number | null,"patient_id": string,"source"?: Database["public"]['Enums']["record_source"],"systolic"?: number | null
                  }
                  Update: {
                    "appointment_id"?: string | null,"author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"clinic_id"?: string,"correction_reason"?: string | null,"corrects_entry_id"?: string | null,"created_at"?: string,"diastolic"?: number | null,"encounter_id"?: string | null,"glucose_mg_dl"?: number | null,"heart_rate"?: number | null,"id"?: string,"note"?: string | null,"oxygen_saturation"?: number | null,"patient_id"?: string,"source"?: Database["public"]['Enums']["record_source"],"systolic"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vital_signs_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vital_signs_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vital_signs_clinic_id_fkey"
      columns: ["clinic_id"]
isOneToOne: false
      referencedRelation: "clinics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vital_signs_corrects_entry_id_fkey"
      columns: ["corrects_entry_id"]
isOneToOne: false
      referencedRelation: "vital_signs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vital_signs_encounter_id_fkey"
      columns: ["encounter_id"]
isOneToOne: false
      referencedRelation: "encounters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vital_signs_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ai_accept_draft":
{ Args: { "p_draft_id": string,"p_edited"?: Json }; Returns: string
                           },
"ai_consent_active":
{ Args: { "p_patient": string,"p_scope": Database["public"]['Enums']["ai_consent_scope"] }; Returns: boolean
                           },
"appointment_range":
{ Args: { "p_duration_minutes": number,"p_starts_at": string }; Returns: unknown
                           },
"audit_row_digest_v1":
{ Args: { "p_action": string,"p_at": string,"p_by": string,"p_clinic": string,"p_new": Json,"p_old": Json,"p_patient": string,"p_prev": string,"p_record": string,"p_seq": number,"p_table": string }; Returns: string
                           },
"audit_verify_chain":
{ Args: { "p_clinic"?: string }; Returns: {
              "checked": number,"first_broken_seq": number,"ok": boolean
            }[]
                           },
"create_prescription":
{ Args: { "p_appointment_id"?: string,"p_encounter_id"?: string,"p_indications"?: string,"p_items": Json,"p_patient_id": string }; Returns: string
                           },
"ensure_profile_for_user":
{ Args: { "p_user": unknown }; Returns: undefined
                           },
"get_my_clinic":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_my_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mfa_satisfied":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"next_clinic_number":
{ Args: { "p_clinic": string,"p_name": string }; Returns: number
                           },
"patients_for_review":
{ Args: { "p_cutoff": string,"p_limit"?: number,"p_now": string }; Returns: {
              "full_name": string,"last_visit": string,"patient_id": string,"phone": string
            }[]
                           },
"platform_assign_first_admin":
{ Args: { "p_clinic": string,"p_user": string }; Returns: undefined
                           },
"platform_create_clinic":
{ Args: { "p_address"?: string,"p_name": string,"p_phone"?: string,"p_tax_id"?: string }; Returns: string
                           },
"platform_list_clinics":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,"admins": number,"created_at": string,"id": string,"name": string,"patients": number
            }[]
                           },
"platform_set_clinic_active":
{ Args: { "p_active": boolean,"p_clinic": string }; Returns: undefined
                           },
"register_procedure":
{ Args: { "p_encounter_id": string,"p_note"?: string,"p_odontogram_condition"?: Database["public"]['Enums']["odontogram_condition"],"p_procedure"?: string,"p_surfaces"?: (string)[],"p_tooth"?: number,"p_treatment_plan_item_id"?: string }; Returns: string
                           }
          }
          Enums: {
            "ai_consent_scope": "dictado"|"procesamiento_ia","ai_draft_kind": "odontograma"|"nota"|"signos"|"plan"|"pregunta","ai_draft_status": "propuesto"|"aceptado"|"rechazado","appointment_status": "programada"|"confirmada"|"en_curso"|"completada"|"cancelada"|"no_asistio","ars_claim_status": "no_aplica"|"pendiente"|"reclamado"|"pagado"|"rechazado","clinical_entry_kind": "nota"|"medicamento"|"procedimiento","encounter_status": "abierta"|"cerrada","insurance_type": "ars"|"privado","odontogram_condition": "sano"|"caries"|"obturacion"|"sellante"|"corona"|"endodoncia"|"fractura"|"extraccion_indicada"|"ausente"|"implante","payment_method": "efectivo"|"tarjeta"|"transferencia"|"cheque","queue_status": "en_espera"|"llamado"|"en_atencion"|"atendido"|"cancelado","record_source": "manual"|"ia_confirmada","treatment_status": "pendiente"|"en_proceso"|"completado"|"cancelado","user_role": "doctor"|"recepcion"|"admin"|"enfermeria"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "ai_consent_scope": ["dictado", "procesamiento_ia"],"ai_draft_kind": ["odontograma", "nota", "signos", "plan", "pregunta"],"ai_draft_status": ["propuesto", "aceptado", "rechazado"],"appointment_status": ["programada", "confirmada", "en_curso", "completada", "cancelada", "no_asistio"],"ars_claim_status": ["no_aplica", "pendiente", "reclamado", "pagado", "rechazado"],"clinical_entry_kind": ["nota", "medicamento", "procedimiento"],"encounter_status": ["abierta", "cerrada"],"insurance_type": ["ars", "privado"],"odontogram_condition": ["sano", "caries", "obturacion", "sellante", "corona", "endodoncia", "fractura", "extraccion_indicada", "ausente", "implante"],"payment_method": ["efectivo", "tarjeta", "transferencia", "cheque"],"queue_status": ["en_espera", "llamado", "en_atencion", "atendido", "cancelado"],"record_source": ["manual", "ia_confirmada"],"treatment_status": ["pendiente", "en_proceso", "completado", "cancelado"],"user_role": ["doctor", "recepcion", "admin", "enfermeria"]
          }
        }
} as const
