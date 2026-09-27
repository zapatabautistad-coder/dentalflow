"use client";

import { useEffect } from "react";

const STORAGE_KEY = "dentalflow-language";

const TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    "sidebar.lang": "Idioma",
    "sidebar.panel": "Panel",
    "sidebar.patients": "Pacientes",
    "sidebar.appointments": "Citas",
    "sidebar.schedule": "Horarios",
    "sidebar.reports": "Reportes",
    "sidebar.settings": "Configuración",
    "panel.title": "Panel general",
    "panel.welcome": "Bienvenida, {name}",
    "panel.today": "HOY",
    "panel.newAppointment": "+ nueva cita",
    "panel.kpi.patients": "Pacientes registrados",
    "panel.kpi.appointments": "Citas de hoy",
    "panel.kpi.waiting": "En sala de espera",
    "panel.kpi.plans": "Planes activos",
    "panel.kpi.empty": "Sin registros",
    "panel.kpi.emptyAgenda": "Sin agenda",
    "panel.kpi.emptyWaiting": "Sin pacientes",
    "panel.kpi.emptyPlans": "Sin planes",
    "panel.agenda": "Agenda de Hoy",
    "panel.agenda.subtitle": "Turnos programados",
    "panel.agenda.view": "Ver todo",
    "panel.agenda.new": "+ nueva cita",
    "panel.agenda.pending": "Pendiente",
    "panel.agenda.unassigned": "Sin asignar",
    "panel.agenda.doctor": "Doctor",
    "panel.financial": "Panel financiero",
    "panel.financial.view": "Ver todos",
    "panel.recent": "Pacientes recientes",
    "panel.emptyState": "No hay datos disponibles",
    "appointments.title": "Citas",
    "appointments.new": "+ Nueva cita",
    "appointments.empty": "No hay citas para este día.",
    "appointments.reasonMissing": "Sin motivo registrado",
    "appointments.patientFallback": "Paciente",
    "appointments.doctor": "Doctor",
    "appointments.change": "Cambiar",
    "appointments.status.current": "Estado actual:",
    "appointments.status.update": "Actualizar estado",
    "appointments.status.updating": "Actualizando…",
    "appointments.status.pending": "Pendiente",
    "appointments.status.unassigned": "Sin asignar",
    "appointments.form.title": "Nueva cita",
    "appointments.form.subtitle": "Programa una cita para un paciente.",
    "appointments.form.patient": "Paciente",
    "appointments.form.doctor": "Doctor",
    "appointments.form.selectDoctor": "Selecciona un doctor",
    "appointments.form.date": "Fecha",
    "appointments.form.time": "Hora",
    "appointments.form.duration": "Duración",
    "appointments.form.reason": "Motivo (opcional)",
    "appointments.form.reasonPlaceholder": "Limpieza, revisión, dolor…",
    "appointments.form.status": "Estado",
    "appointments.form.cancel": "Cancelar",
    "appointments.form.save": "Guardar cita",
    "appointments.form.saving": "Guardando…",
    "appointments.form.select": "Selecciona una opción",
    "patients.title": "Pacientes",
    "patients.subtitle": "Gestiona la lista de pacientes de la clínica.",
    "patients.new": "+ Nuevo paciente",
    "patients.search.placeholder": "Buscar por nombre o teléfono…",
    "patients.search.aria": "Buscar pacientes",
    "patients.table.record": "Expediente",
    "patients.table.name": "Nombre",
    "patients.table.document": "Cédula",
    "patients.table.phone": "Teléfono",
    "patients.table.insurance": "Aseguradora",
    "patients.table.registered": "Registrado",
    "patients.empty.search": "No se encontraron pacientes con ese criterio de búsqueda.",
    "patients.empty.none": "Todavía no hay pacientes registrados.",
    "patient.search.placeholder": "Buscar paciente por nombre, cédula o teléfono…",
    "patient.search.empty": "Sin resultados.",
    "patient.change": "Cambiar",
    "patient.unknown": "Paciente",
    "patient.form.fullName": "Nombre completo",
    "patient.form.fullNamePlaceholder": "Nombre y apellidos",
    "patient.form.documentLabel": "Cédula",
    "patient.form.documentRequired": "(obligatoria)",
    "patient.form.documentOptional": "(opcional)",
    "patient.form.phone": "Teléfono",
    "patient.form.email": "Correo (opcional)",
    "patient.form.emailPlaceholder": "paciente@correo.com",
    "patient.form.birthDate": "Fecha de nacimiento (opcional)",
    "patient.form.insurance": "Aseguradora",
    "patient.form.insuranceNone": "Sin especificar",
    "patient.form.ars": "ARS",
    "patient.form.private": "Privado",
    "patient.form.arsName": "Nombre de la ARS",
    "patient.form.affiliate": "Número de afiliado",
    "patient.form.notes": "Notas (opcional)",
    "patient.form.cancel": "Cancelar",
    "language.es": "Español",
    "language.en": "English",
    "language.pt": "Português",
    "language.fr": "Français",
    "language.de": "Deutsch",
    "language.it": "Italiano",
  },
  en: {
    "sidebar.lang": "Language",
    "sidebar.panel": "Dashboard",
    "sidebar.patients": "Patients",
    "sidebar.appointments": "Appointments",
    "sidebar.schedule": "Schedule",
    "sidebar.reports": "Reports",
    "sidebar.settings": "Settings",
    "panel.title": "Overview",
    "panel.welcome": "Welcome, {name}",
    "panel.today": "TODAY",
    "panel.newAppointment": "+ new appointment",
    "panel.kpi.patients": "Registered patients",
    "panel.kpi.appointments": "Appointments today",
    "panel.kpi.waiting": "In waiting room",
    "panel.kpi.plans": "Active plans",
    "panel.kpi.empty": "No records",
    "panel.kpi.emptyAgenda": "No schedule",
    "panel.kpi.emptyWaiting": "No patients",
    "panel.kpi.emptyPlans": "No plans",
    "panel.agenda": "Today’s Agenda",
    "panel.agenda.subtitle": "Scheduled visits",
    "panel.agenda.view": "View all",
    "panel.agenda.new": "+ new appointment",
    "panel.agenda.pending": "Pending",
    "panel.agenda.unassigned": "Unassigned",
    "panel.agenda.doctor": "Doctor",
    "panel.financial": "Financial overview",
    "panel.financial.view": "View all",
    "panel.recent": "Recent patients",
    "panel.emptyState": "No data available",
    "appointments.title": "Appointments",
    "appointments.new": "+ New appointment",
    "appointments.empty": "No appointments for this day.",
    "appointments.reasonMissing": "No reason recorded",
    "appointments.patientFallback": "Patient",
    "appointments.doctor": "Doctor",
    "appointments.change": "Change",
    "appointments.status.current": "Current status:",
    "appointments.status.update": "Update status",
    "appointments.status.updating": "Updating…",
    "appointments.status.pending": "Pending",
    "appointments.status.unassigned": "Unassigned",
    "appointments.form.title": "New appointment",
    "appointments.form.subtitle": "Schedule an appointment for a patient.",
    "appointments.form.patient": "Patient",
    "appointments.form.doctor": "Doctor",
    "appointments.form.selectDoctor": "Select a doctor",
    "appointments.form.date": "Date",
    "appointments.form.time": "Time",
    "appointments.form.duration": "Duration",
    "appointments.form.reason": "Reason (optional)",
    "appointments.form.reasonPlaceholder": "Cleaning, review, pain…",
    "appointments.form.status": "Status",
    "appointments.form.cancel": "Cancel",
    "appointments.form.save": "Save appointment",
    "appointments.form.saving": "Saving…",
    "appointments.form.select": "Select an option",
    "patients.title": "Patients",
    "patients.subtitle": "Manage the clinic patient list.",
    "patients.new": "+ New patient",
    "patients.search.placeholder": "Search by name or phone…",
    "patients.search.aria": "Search patients",
    "patients.table.record": "Record",
    "patients.table.name": "Name",
    "patients.table.document": "ID",
    "patients.table.phone": "Phone",
    "patients.table.insurance": "Insurance",
    "patients.table.registered": "Registered",
    "patients.empty.search": "No patients matched that search.",
    "patients.empty.none": "No patients registered yet.",
    "patient.search.placeholder": "Search patient by name, ID or phone…",
    "patient.search.empty": "No results.",
    "patient.change": "Change",
    "patient.unknown": "Patient",
    "patient.form.fullName": "Full name",
    "patient.form.fullNamePlaceholder": "Name and surname",
    "patient.form.documentLabel": "Document",
    "patient.form.documentRequired": "(required)",
    "patient.form.documentOptional": "(optional)",
    "patient.form.phone": "Phone",
    "patient.form.email": "Email (optional)",
    "patient.form.emailPlaceholder": "patient@email.com",
    "patient.form.birthDate": "Birth date (optional)",
    "patient.form.insurance": "Insurance",
    "patient.form.insuranceNone": "Not specified",
    "patient.form.ars": "Health insurance",
    "patient.form.private": "Private",
    "patient.form.arsName": "Insurance provider",
    "patient.form.affiliate": "Affiliate number",
    "patient.form.notes": "Notes (optional)",
    "patient.form.cancel": "Cancel",
    "language.es": "Spanish",
    "language.en": "English",
    "language.pt": "Portuguese",
    "language.fr": "French",
    "language.de": "German",
    "language.it": "Italian",
  },
};

function applyTranslations(lang: string) {
  const dictionary = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  document.documentElement.lang = lang;

  const nodes = document.querySelectorAll<HTMLElement>("[data-i18n]");

  nodes.forEach((node) => {
    const key = node.dataset.i18n;
    if (!key) return;

    const value = dictionary[key];
    if (!value) return;

    node.textContent = value;
  });

  const placeholderNodes = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]");
  placeholderNodes.forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (!key) return;

    const value = dictionary[key];
    if (!value) return;

    node.placeholder = value;
  });

  const nameNodes = document.querySelectorAll<HTMLElement>("[data-i18n-name]");
  nameNodes.forEach((node) => {
    const key = node.dataset.i18nName;
    if (!key) return;

    const template = dictionary[key];
    if (!template) return;

    const userName = node.dataset.userName ?? "";
    node.textContent = template.replace("{name}", userName);
  });
}

export function LanguageBridge() {
  useEffect(() => {
    const getStoredLanguage = () => {
      if (typeof window === "undefined") return "es";
      return localStorage.getItem(STORAGE_KEY) ?? "es";
    };

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const lang = customEvent.detail ?? getStoredLanguage();
      localStorage.setItem(STORAGE_KEY, lang);
      applyTranslations(lang);
    };

    const initialLanguage = getStoredLanguage();
    localStorage.setItem(STORAGE_KEY, initialLanguage);
    applyTranslations(initialLanguage);

    document.addEventListener("dentalflow-language-change", handleLanguageChange);

    return () => {
      document.removeEventListener("dentalflow-language-change", handleLanguageChange);
    };
  }, []);

  return null;
}
