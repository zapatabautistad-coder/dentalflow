import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canCreatePatients, type Role } from "@/lib/auth";
import { USER_ID_HEADER } from "@/lib/auth-headers";
import { validateCedula } from "@/lib/cedula";

export const dynamic = "force-dynamic";

type IdentityData = {
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string;
  genero?: string;
};

type ExistingPatient = {
  id: string;
  fullName: string;
  recordNumber: number;
};

type LookupResponse = {
  success: boolean;
  data: IdentityData | null;
  message?: string;
  existingPatient?: ExistingPatient;
};

function json(body: LookupResponse, status = 200) {
  return NextResponse.json(body, { status });
}

// Consulta interna de cédula para autocompletar el formulario de pacientes.
// El navegador nunca llama al proveedor de identidad directamente: solo a
// esta ruta, que decide si hace falta salir a un servicio externo.
export async function GET(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return json({ success: false, data: null, message: "Sesión no válida." }, 401);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !canCreatePatients(profile.role as Role)) {
    return json({ success: false, data: null, message: "No tienes permiso para esta consulta." }, 403);
  }

  const rawCedula = request.nextUrl.searchParams.get("cedula") ?? "";
  const digits = rawCedula.replace(/\D/g, "");

  if (!validateCedula(digits)) {
    return json({ success: false, data: null, message: "La cédula no es válida." }, 400);
  }

  // 1) ¿Ya existe un paciente con esta cédula? No se autocompleta con sus
  // datos (sería crear un duplicado): se avisa y se enlaza a su ficha.
  const { data: existing } = await supabase
    .from("patients")
    .select("id, full_name, record_number")
    .eq("document_id", digits)
    .is("archived_at", null)
    .maybeSingle();

  if (existing) {
    return json({
      success: true,
      data: null,
      message: "Ya existe un paciente registrado con esta cédula.",
      existingPatient: {
        id: existing.id,
        fullName: existing.full_name,
        recordNumber: existing.record_number,
      },
    });
  }

  // 2) No está en la base local: se intenta con el proveedor de identidad
  // configurado. Sin proveedor configurado no se inventan datos (regla del
  // proyecto): se avisa y el usuario llena el formulario a mano.
  const apiUrl = process.env.IDENTITY_API_URL;
  const apiKey = process.env.IDENTITY_API_KEY;

  if (!apiUrl || !apiKey) {
    return json({
      success: false,
      data: null,
      message: "No hay un servicio de identidad configurado; completa los datos manualmente.",
    });
  }

  try {
    const response = await fetch(`${apiUrl}?cedula=${digits}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return json({
        success: false,
        data: null,
        message: "No se encontró información para esta cédula.",
      });
    }

    if (!response.ok) {
      return json(
        {
          success: false,
          data: null,
          message: "El servicio de identidad no respondió; completa los datos manualmente.",
        },
        502
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const nombres = String(payload.nombres ?? "").trim();
    const apellidos = String(payload.apellidos ?? "").trim();

    if (!nombres && !apellidos) {
      return json({
        success: false,
        data: null,
        message: "No se encontró información para esta cédula.",
      });
    }

    const fechaNacimiento = payload.fechaNacimiento ? String(payload.fechaNacimiento) : undefined;
    const genero = payload.genero ? String(payload.genero) : undefined;

    return json({
      success: true,
      data: { nombres, apellidos, fechaNacimiento, genero },
    });
  } catch {
    return json(
      {
        success: false,
        data: null,
        message: "No se pudo consultar el servicio de identidad; completa los datos manualmente.",
      },
      502
    );
  }
}
