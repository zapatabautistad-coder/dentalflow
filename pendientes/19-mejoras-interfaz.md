# Mejoras de interfaz (2026-10-17)

Origen: captura de referencia del odontograma, revisión de Copilot (Microsoft) y revisión de Claude. Ninguna requiere migración salvo donde se indica. Orden acordado:

1. **Legibilidad (Claude, PR de estilos):** texto principal casi negro y secundario gris oscuro; barra lateral en `#0766B5` con texto blanco; escala fija de letra (más grande y gruesa en títulos, pestañas y menú); superficies sólidas en formularios, tablas y registros clínicos (vidrio solo en menú, tarjetas principales y botón principal); bordes de campos y foco de teclado visibles; un solo botón principal por pantalla; espacios en escala 8/16/24/32. Requiere OK explícito de Darys (diseño congelado).
2. **Odontograma nuevo (Copilot, prompt pendiente):** cabecera fija del paciente (nombre, expediente, edad, teléfono, ARS, alertas) y pestañas (odontograma, historial, plan, recetas, facturación); dientes dibujados; panel lateral del diente con superficies y registro de hallazgo; historial del diente desde la base. Sin buscador ni "Configuración" hasta que existan; nada de datos de ejemplo.
3. **Análisis (Copilot, prompt pendiente):** ingresos por periodo y tendencia mensual, cobros vs. cargos, cuentas pendientes, cancelaciones y ausencias, tiempo medio en sala de espera, procedimientos más realizados, pacientes nuevos vs. recurrentes, exportar CSV. Producción por doctor en dinero necesita enlazar cargo ↔ procedimiento: va en la próxima migración agrupada.

Otros:
- Tablas: encabezado marcado, filas más altas, paginación, orden por columna.
- Login: mostrar/ocultar contraseña; aviso de privacidad y versión. (Ya existen: pantalla MFA, error y estado de carga.)
- Glosario de términos (p. ej. "Balance" → "Saldo").
- Estados de carga/vacío/error en todas las pantallas (A3), celular/tablet, accesibilidad (A4), monitorización de errores y caídas.
- Negocio (Darys): clínica piloto o cartas de intención; prueba de seguridad externa y suscripciones cuando haya clientes.
