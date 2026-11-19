/**
 * @archivo src/services/googleDocsService.ts
 * @descripción Servicio de integración con Firebase Auth, Google Docs API y Google Drive API.
 * Gestiona autenticación con scopes de Workspace e inserción estructurada del manual institucional.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));

let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Inicializa el observador del estado de autenticación.
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Inicia sesión con Google Popup solicitando scopes de Google Docs y Drive.
 */
export const signInWithGoogleDocs = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retorna el token de acceso en memoria.
 */
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Cierra la sesión de Google en el cliente.
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Crea un documento de Google Docs con el manual de usuario institucional.
 */
export const exportManualToGoogleDoc = async (
  accessToken: string,
  tituloDocumento = 'Manual de Usuario - Instituto José Peña (Ciclo 2026)'
): Promise<{ documentId: string; url: string }> => {
  // 1. Crear documento en blanco
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: tituloDocumento,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Error al crear el documento en Google Docs');
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Contenido completo del Manual
  const contenidoManual = `MANUAL INTEGRAL DE USUARIO Y MATRIZ FUNCIONAL
SISTEMA DE GESTIÓN ACADÉMICA E INSTITUCIONAL - INSTITUTO JOSÉ PEÑA
Versión: 2.4.0 (Ciclo Lectivo 2026) | Dirección y Secretaría Académica

================================================================================
1. VISIÓN GENERAL DE LA APLICACIÓN
================================================================================
El Sistema de Gestión del Instituto José Peña centraliza y transparenta la trayectoria académica, administrativa y pedagógica de la comunidad escolar.

Objetivos clave:
• Centralización y trazabilidad de legajos (Usuarios, Cursos, Secciones, Materias y Parentescos).
• Seguimiento pedagógico y calificaciones trimestrales con cálculo en tiempo real de promedios.
• Control diario del presentismo escolar (Alumnos) y parte diario de cumplimiento docente.
• Comunicación directa con tutores legales y generación de boletines oficiales en PDF.
• Calendario institucional interactivo para gestión de exámenes, jornadas pedagógicas y reuniones.
• Auditoría y actas reglamentarias de validación y cierre de calificaciones.

================================================================================
2. MATRIZ DE ROLES Y PERMISOS: ¿QUÉ PUEDE Y QUÉ NO PUEDE CADA ROL?
================================================================================

A) ROL ADMINISTRADOR:
✓ QUÉ PUEDE HACER:
  - Control total sobre todos los módulos institucionales.
  - Gestión integral (Crear, Editar, Eliminar) de Usuarios, Cursos, Secciones, Materias y Parentescos.
  - Registro y edición de cualquier calificación, asistencia o sanción.
  - Cierre y validación reglamentaria de actas y planillas.
  - Creación de eventos en el Calendario Académico (Exámenes, Actos, Feriados).
  - Exportación de balances estadísticos globales en PDF.
✗ QUÉ NO PUEDE HACER:
  - No puede vulnerar la correlación de datos (ej: no se puede eliminar un curso con alumnos activos sin reasignación previa).

B) ROL NO DOCENTE (Preceptoría y Secretaría):
✓ QUÉ PUEDE HACER:
  - Registro de asistencia diaria de Alumnos y Docentes con marcación rápida (Presente / Ausente).
  - Consulta general en el Registro Unificado de Personas y acceso a la Ficha Completa del Docente (módulos horarios, legajo, contacto y faltas).
  - Carga y justificación de inasistencias con certificados médicos o notas de tutores.
  - Validación y cierre de actas de calificaciones enviadas por los profesores.
  - Generación de reportes institucionales y planillas de control en PDF.
  - Creación de eventos en el Calendario Institucional (Reuniones de Padres, Actos).
✗ QUÉ NO PUEDE HACER:
  - No puede crear ni eliminar Cursos, Secciones ni usuarios del sistema.
  - No puede alterar arbitrariamente notas pedagógicas sin autorización expresa de Rectoría.

C) ROL DOCENTE:
✓ QUÉ PUEDE HACER:
  - Carga, modificación y eliminación exclusiva de calificaciones en las materias de las que es titular (Regla de titularidad estricta).
  - Consulta de su Grilla Horaria semanal (días, horas, aulas y divisiones asignadas).
  - Consulta de su registro de presentismo y actas administrativas de inasistencias.
  - Consulta del Calendario Académico de exámenes y feriados.
✗ QUÉ NO PUEDE HACER:
  - No puede modificar notas de asignaturas a cargo de otros docentes.
  - No puede alterar el estado de matriculación de los estudiantes ni crear materias.

D) ROL ALUMNO:
✓ QUÉ PUEDE HACER:
  - Consulta transparente de su Boletín Académico (calificaciones del 1°, 2° y 3° Trimestre y promedio correlativo).
  - Monitoreo de sus faltas acumuladas y sanciones de conducta registradas.
  - Consulta del Calendario Académico y cronograma de exámenes parciales / coloquios.
✗ QUÉ NO PUEDE HACER:
  - No tiene permisos de edición sobre ningún dato del sistema (Acceso de solo lectura).
  - No puede ver datos personales, notas o asistencias de otros estudiantes.

E) ROL PADRE / TUTOR LEGAL:
✓ QUÉ PUEDE HACER:
  - Acceso directo al Expediente Escolar de sus hijos vinculados legalmente.
  - Si tiene múltiples hijos, puede alternar entre ellos mediante el selector superior.
  - Visualización del rendimiento por asignatura, inasistencias acumuladas y sanciones.
  - Descarga oficial del Boletín de Calificaciones en PDF membretado con línea de firma institucional.
✗ QUÉ NO PUEDE HACER:
  - No puede acceder a legajos de estudiantes con los que no posea vínculo legal acreditado.
  - No puede modificar información académica o administrativa.

================================================================================
3. FUNCIONALIDADES DE CADA ELEMENTO Y MÓDULOS DE LA PLATAFORMA
================================================================================

1. MÓDULO INICIO / DASHBOARD:
  • Tarjetas KPI: Contadores en tiempo real de usuarios, alumnos matriculados, docentes, materias y tutores.
  • Calendario Académico: Grilla mensual y agenda cronológica con filtros por tipo de evento (+ Nuevo Evento para coordinadores).
  • Accesos directos a gestiones frecuentes.

2. MÓDULO CONTROL DE ASISTENCIAS:
  • Selector de fecha con navegación rápida (Ayer, Hoy, Mañana).
  • Badges cromáticos de alta visibilidad: Presente (#0f5132) y Ausente (#842029).
  • Campo de texto para justificaciones pedagógicas o certificados médicos.

3. MÓDULO REGISTRO UNIFICADO / CONSULTA DE PERSONAS:
  • Buscador universal que filtra en tiempo real por DNI, Nombre, Apellido, Barrio o Curso.
  • Botón "Ver Ficha Completa": Abre la ficha integral del docente con contacto, materias y grilla horaria semanal por módulos de 40 min / 2 hs cátedra.

4. MÓDULO REPORTES Y ESTADÍSTICAS:
  • Gráficos analíticos de rendimiento escolar (Promocionados >= 8, Aprobados 6-7, Desaprobados < 6).
  • Planilla de asistencia docente con filtros interactivos por estado.
  • Validación formal de planillas de calificaciones con botón "Validar y Cerrar Acta".
  • Exportadores a PDF oficiales: Informe General, Planilla Docente y Acta de Validación.

5. MÓDULO BOLETÍN DEL TUTOR / ALUMNO:
  • Selector de hijos a cargo.
  • Tabla desglosada por materias con notas trimestrales y estado de promoción.
  • Botón "Descargar Boletín (PDF)" con formato oficial listo para impresión y archivo institucional.

================================================================================
Documento emitido y sincronizado automáticamente desde el Sistema de Gestión Académica.
Instituto José Peña - Córdoba, Argentina.
`;

  // 3. Insertar el texto en el documento mediante batchUpdate
  const insertRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: contenidoManual,
            },
          },
        ],
      }),
    }
  );

  if (!insertRes.ok) {
    const err = await insertRes.json();
    console.error('Error insertando texto en Docs:', err);
  }

  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  return {
    documentId,
    url: documentUrl,
  };
};
