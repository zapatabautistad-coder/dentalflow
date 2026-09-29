"use client";

import { useEffect } from "react";

const STORAGE_KEY = "dentalflow-language";

const TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    "sidebar.lang": "Idioma",
    "sidebar.panel": "Panel",
    "sidebar.patients": "Pacientes",
    "sidebar.appointments": "Citas",
    "sidebar.waitingRoom": "Sala de espera",
    "waitingRoom.title": "Sala de espera",
    "waitingRoom.empty": "No hay pacientes en sala de espera.",
    "waitingRoom.doctor": "Doctor",
    "waitingRoom.waitingMinutes": "minutos esperando",
    "waitingRoom.action.arrived": "Llegó",
    "waitingRoom.action.call": "Llamar",
    "waitingRoom.action.inCare": "En atención",
    "waitingRoom.action.attended": "Atendido",
    "waitingRoom.action.cancel": "Cancelar",
    "waitingRoom.status.waiting": "En espera",
    "waitingRoom.status.called": "Llamado",
    "waitingRoom.status.inCare": "En atención",
    "waitingRoom.status.attended": "Atendido",
    "waitingRoom.status.cancelled": "Cancelado",
    "waitingRoom.error.permission": "No tienes permiso para realizar esta acción.",
    "waitingRoom.error.empty": "No tienes pacientes esperando.",
    "waitingRoom.action.callNext": "Llamar siguiente",
    "waitingRoom.error.save": "No se pudo guardar el cambio. Recarga la página e inténtalo de nuevo.",
    "waitingRoom.error.load": "No se pudo cargar la sala de espera. Recarga la página.",
    "appointments.queueLoadError": "No se pudo verificar la sala de espera; se ocultaron los botones de llegada.",
    "chart.back": "← Pacientes",
    "chart.newAppointment": "Nueva cita",
    "chart.editData": "Editar datos",
    "chart.noHistory": "Historial médico no registrado",
    "chart.noHistory.hint": "Pregunte por alergias, medicamentos y enfermedades antes de cualquier procedimiento, y regístrelo abajo.",
    "chart.alerts": "Alertas médicas",
    "chart.noAlerts": "Sin alertas médicas registradas",
    "chart.clinical": "Registro clínico",
    "chart.clinical.hint": "Notas de evolución, medicamentos administrados y procedimientos. Lo registrado no se edita ni se borra: se corrige con motivo.",
    "chart.history": "Historial médico",
    "chart.history.hint": "Marque lo que aplique. Quien guarde queda registrado con fecha y hora.",
    "chart.upcoming": "Próximas citas",
    "chart.past": "Citas anteriores",
    "chart.notes": "Notas",
    "medical.allergies": "Alergias",
    "medical.allergy.penicillin": "Penicilina / amoxicilina",
    "medical.allergy.anesthetic": "Anestésicos locales",
    "medical.allergy.nsaids": "AINEs (ibuprofeno, aspirina)",
    "medical.allergy.latex": "Látex",
    "medical.allergies.other": "Otras alergias",
    "medical.medications": "Medicamentos",
    "medical.med.anticoagulants": "Anticoagulantes / antiagregantes",
    "medical.med.bisphosphonates": "Bifosfonatos",
    "medical.medications.current": "Medicamentos actuales",
    "medical.conditions": "Condiciones",
    "medical.cond.diabetes": "Diabetes",
    "medical.cond.hypertension": "Hipertensión",
    "medical.cond.heart": "Cardiopatía",
    "medical.cond.pregnancy": "Embarazo",
    "medical.conditions.other": "Otras condiciones",
    "panel.title": "Panel general",
    "panel.welcome": "Hola, {name}",
    "panel.newAppointment": "+ nueva cita",
    "panel.loadError": "No se pudieron cargar algunos datos. Recarga la página.",
    "panel.kpi.patients": "Pacientes registrados",
    "panel.kpi.appointments": "Citas de hoy",
    "panel.kpi.waiting": "En sala de espera",
    "panel.kpi.completed": "Completadas hoy",
    "panel.agenda": "Agenda de Hoy",
    "panel.agenda.subtitle": "Citas programadas",
    "panel.agenda.view": "Ver todo",
    "panel.agenda.empty": "No hay citas para hoy.",
    "panel.recent": "Pacientes recientes",
    "panel.recent.view": "Ver todos",
    "panel.recent.empty": "Aún no hay pacientes registrados.",
    "panel.review.title": "Pacientes para revisión",
    "panel.review.lastVisit": "Última visita:",
    "panel.review.empty": "No hay pacientes pendientes de revisión.",
    "panel.review.loadError": "No se pudieron cargar los pacientes para revisión.",
    "appointments.title": "Citas",
    "appointments.new": "+ Nueva cita",
    "appointments.kpi.total": "Total del día",
    "appointments.kpi.pending": "Por confirmar",
    "appointments.kpi.confirmed": "Confirmadas",
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
  },
  en: {
    "sidebar.lang": "Language",
    "sidebar.panel": "Dashboard",
    "sidebar.patients": "Patients",
    "sidebar.appointments": "Appointments",
    "sidebar.waitingRoom": "Waiting room",
    "waitingRoom.title": "Waiting room",
    "waitingRoom.empty": "There are no patients in the waiting room.",
    "waitingRoom.doctor": "Doctor",
    "waitingRoom.waitingMinutes": "minutes waiting",
    "waitingRoom.action.arrived": "Arrived",
    "waitingRoom.action.call": "Call",
    "waitingRoom.action.inCare": "In treatment",
    "waitingRoom.action.attended": "Attended",
    "waitingRoom.action.cancel": "Cancel",
    "waitingRoom.status.waiting": "Waiting",
    "waitingRoom.status.called": "Called",
    "waitingRoom.status.inCare": "In treatment",
    "waitingRoom.status.attended": "Attended",
    "waitingRoom.status.cancelled": "Cancelled",
    "waitingRoom.error.permission": "You do not have permission to perform this action.",
    "waitingRoom.error.empty": "You have no patients waiting.",
    "waitingRoom.action.callNext": "Call next",
    "waitingRoom.error.save": "Could not save the change. Reload the page and try again.",
    "waitingRoom.error.load": "Could not load the waiting room. Reload the page.",
    "appointments.queueLoadError": "Could not verify the waiting room; arrival buttons were hidden.",
    "chart.back": "← Patients",
    "chart.newAppointment": "New appointment",
    "chart.editData": "Edit data",
    "chart.noHistory": "Medical history not recorded",
    "chart.noHistory.hint": "Ask about allergies, medications, and conditions before any procedure, and record them below.",
    "chart.alerts": "Medical alerts",
    "chart.noAlerts": "No medical alerts recorded",
    "chart.clinical": "Clinical record",
    "chart.clinical.hint": "Progress notes, medications administered, and procedures. Entries are not edited or deleted: they are corrected with a reason.",
    "chart.history": "Medical history",
    "chart.history.hint": "Check all that apply. The person saving the record is logged with date and time.",
    "chart.upcoming": "Upcoming appointments",
    "chart.past": "Previous appointments",
    "chart.notes": "Notes",
    "medical.allergies": "Allergies",
    "medical.allergy.penicillin": "Penicillin / amoxicillin",
    "medical.allergy.anesthetic": "Local anesthetics",
    "medical.allergy.nsaids": "NSAIDs (ibuprofen, aspirin)",
    "medical.allergy.latex": "Latex",
    "medical.allergies.other": "Other allergies",
    "medical.medications": "Medications",
    "medical.med.anticoagulants": "Anticoagulants / antiplatelet agents",
    "medical.med.bisphosphonates": "Bisphosphonates",
    "medical.medications.current": "Current medications",
    "medical.conditions": "Conditions",
    "medical.cond.diabetes": "Diabetes",
    "medical.cond.hypertension": "Hypertension",
    "medical.cond.heart": "Heart disease",
    "medical.cond.pregnancy": "Pregnancy",
    "medical.conditions.other": "Other conditions",
    "panel.title": "Overview",
    "panel.welcome": "Hello, {name}",
    "panel.newAppointment": "+ new appointment",
    "panel.loadError": "Some data could not be loaded. Reload the page.",
    "panel.kpi.patients": "Registered patients",
    "panel.kpi.appointments": "Appointments today",
    "panel.kpi.waiting": "In waiting room",
    "panel.kpi.completed": "Completed today",
    "panel.agenda": "Today’s Agenda",
    "panel.agenda.subtitle": "Scheduled appointments",
    "panel.agenda.view": "View all",
    "panel.agenda.empty": "No appointments today.",
    "panel.recent": "Recent patients",
    "panel.recent.view": "View all",
    "panel.recent.empty": "No patients registered yet.",
    "panel.review.title": "Patients for review",
    "panel.review.lastVisit": "Last visit:",
    "panel.review.empty": "No patients pending review.",
    "panel.review.loadError": "Could not load patients for review.",
    "appointments.title": "Appointments",
    "appointments.new": "+ New appointment",
    "appointments.kpi.total": "Total for the day",
    "appointments.kpi.pending": "To confirm",
    "appointments.kpi.confirmed": "Confirmed",
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

    setOwnText(node, value);
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
    setOwnText(node, template.replace("{name}", userName));
  });
}

// Cambia solo el texto propio del elemento, sin tocar sus hijos (inputs,
// selects) y reutilizando el nodo de texto existente para no romper a React.
function setOwnText(node: HTMLElement, value: string) {
  const textNodes = Array.from(node.childNodes).filter(
    (child): child is Text => child.nodeType === Node.TEXT_NODE
  );
  const target = textNodes.find((child) => child.data.trim() !== "") ?? textNodes[0];

  if (!target) {
    if (node.childElementCount === 0) node.textContent = value;
    return;
  }

  target.data = node.childElementCount === 0 ? value : `${value} `;
  if (node.childElementCount === 0) {
    textNodes.forEach((child) => {
      if (child !== target) child.data = "";
    });
  }
}

export function LanguageBridge() {
  useEffect(() => {
    const getStoredLanguage = () => {
      if (typeof window === "undefined") return "es";
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && stored in TRANSLATIONS ? stored : "es";
    };

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const lang = customEvent.detail ?? getStoredLanguage();
      localStorage.setItem(STORAGE_KEY, lang);
      applyTranslations(lang);
    };

    const initialLanguage = getStoredLanguage();
    document.documentElement.lang = initialLanguage;
    localStorage.setItem(STORAGE_KEY, initialLanguage);
    applyTranslations(initialLanguage);

    document.addEventListener("dentalflow-language-change", handleLanguageChange);

    return () => {
      document.removeEventListener("dentalflow-language-change", handleLanguageChange);
    };
  }, []);

  return null;
}
