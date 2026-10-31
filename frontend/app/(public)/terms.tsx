import React from 'react';
import LegalDocument from '../../src/components/LegalDocument';

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Términos de uso"
      eyebrow="HabitApp · Condiciones"
      subtitle="Reglas para usar HabitApp como familia: cuentas, tareas, recompensas y menores."
      heroIcon="document-text"
      heroTone="secondary"
      intro="Al crear una cuenta, entrar como hijo o usar HabitApp aceptas estos términos y la Política de privacidad. Si no estás de acuerdo, no uses el servicio. El «operador» es quien publica la app y mantiene el servidor de tu instalación."
      updatedAt="12 ago 2026"
      sections={[
        {
          title: 'Qué es HabitApp',
          icon: 'apps-outline',
          tone: 'secondary',
          body:
            'HabitApp es una herramienta familiar para asignar tareas del hogar, registrar recompensas, metas de ahorro, logros y solicitudes de retiro. Incluye calendario, avisos, evidencias con foto opcional y un acceso infantil con código y PIN. Las funciones exactas dependen de la versión desplegada. No es un banco, una pasarela de pagos, una escuela ni una red social.',
        },
        {
          title: 'Aceptación',
          icon: 'checkmark-done-outline',
          tone: 'success',
          body:
            'El tutor acepta estos términos al registrarse (incluido el recuadro de términos y privacidad). El menor los usa bajo la responsabilidad del tutor. Si invitas a otro adulto a la familia, ese adulto también queda sujeto a estas reglas al unirse con el código de invitación.',
        },
        {
          title: 'Elegibilidad y menores',
          icon: 'people-outline',
          tone: 'primary',
          bullets: [
            'La cuenta con correo y contraseña es solo para un adulto con capacidad legal.',
            'Los perfiles de hijos los crea y supervisa ese adulto. El menor entra con código de familia y PIN, sin correo.',
            'El tutor declara tener autoridad parental o de tutela sobre los menores que registre.',
            'El detalle de datos infantiles está en «Privacidad y menores».',
          ],
        },
        {
          title: 'Cuenta, familia y seguridad',
          icon: 'shield-outline',
          tone: 'accent',
          bullets: [
            'Eres responsable de tu contraseña (mínimo 8 caracteres), del código de familia y de los PIN de los hijos.',
            'No compartas el acceso de tutor en el teléfono del hijo. Puedes cerrar otras sesiones desde el perfil.',
            'El dueño de la familia (quien la creó) puede invitar a otros tutores. Cada uno debe usar su propia cuenta.',
            'Avisa al operador si detectas uso no autorizado. El operador puede suspender cuentas que incumplan estos términos o la ley.',
            'Si olvidas la contraseña, usa el flujo de restablecimiento al correo de la cuenta.',
          ],
        },
        {
          title: 'Recompensas y dinero',
          icon: 'wallet-outline',
          tone: 'secondary',
          body:
            'Los montos, saldos, metas y retiros son un registro del acuerdo entre la familia. HabitApp no mueve dinero real, no guarda tarjetas ni cobra comisiones bancarias. Cuando un hijo pide un retiro y el tutor lo aprueba, el adulto entrega el efectivo u otra recompensa fuera de la app. Un error de registro no crea una deuda legal automática: corrígelo en la app o entre ustedes. El operador no es parte de ese pacto familiar.',
        },
        {
          title: 'Tareas, fotos y contenido',
          icon: 'camera-outline',
          tone: 'primary',
          bullets: [
            'El tutor define tareas, montos, fechas y quién las hace. Puede aprobar, rechazar o restablecer.',
            'Las fotos de evidencia son opcionales y solo para acreditar la tarea. Prohibido contenido ilegal, sexual, violento, de acoso o que exponga a terceros sin necesidad.',
            'No subas documentos de identidad ni datos sensibles. El tutor debe rechazar evidencias inadecuadas.',
            'El contenido que publicas en la familia (textos, fotos, comentarios) lo licenciáis al operador solo para prestar el servicio a esa familia, no para venderlo a terceros.',
          ],
        },
        {
          title: 'Uso permitido y prohibido',
          icon: 'ban-outline',
          tone: 'accent',
          bullets: [
            'Usa la app para hábitos y tareas del hogar de tu familia.',
            'No intentes acceder a otra familia, adivinar PIN ajenos, sobrecargar el servidor ni eludir los límites de intentos.',
            'No uses HabitApp para trabajo infantil ilegal, explotación, ni para sustituir obligaciones legales de cuidado.',
            'No revendas el servicio ni copies la marca, el código o los textos legales como si fueran tuyos.',
            'Los datos de ejemplo («cargar demo») son ficticios para probar la app; no los presentes como actividad real de un menor.',
          ],
        },
        {
          title: 'Invitaciones y roles',
          icon: 'mail-outline',
          tone: 'primary',
          body:
            'Un código de invitación permite que otro adulto se una a la misma familia. Compártelo solo con personas de confianza. El dueño puede tener permisos extra (por ejemplo, limpiar actividad). Quien se une acepta ver y tratar datos de los menores de esa familia con el mismo cuidado que el tutor principal.',
        },
        {
          title: 'Avisos y permisos del teléfono',
          icon: 'notifications-outline',
          tone: 'secondary',
          body:
            'Puedes usar HabitApp sin cámara y sin notificaciones push. Si las activas, aplican las reglas de privacidad. El operador no garantiza que un aviso llegue al instante (depende del sistema del teléfono y de Expo).',
        },
        {
          title: 'Disponibilidad y copias',
          icon: 'cloud-outline',
          tone: 'primary',
          body:
            'El servicio se ofrece «tal cual»: puede haber cortes, errores o pérdida de datos. El tutor puede exportar un respaldo JSON de la actividad a su dispositivo; esa copia es su responsabilidad. No prometemos copia de seguridad continua en la nube más allá de lo que el operador configure. Haz respaldos si los registros familiares te importan.',
        },
        {
          title: 'Propiedad intelectual',
          icon: 'color-palette-outline',
          tone: 'secondary',
          body:
            'HabitApp, el nombre, el diseño y el software pertenecen al operador o a sus licenciantes. Se te concede una licencia limitada, no exclusiva y revocable para usar la app en tu familia, sin sublicenciarla. No se te vende el código fuente.',
        },
        {
          title: 'Suspensión y cierre',
          icon: 'exit-outline',
          tone: 'accent',
          body:
            'Puedes dejar de usar la app y pedir al operador que elimine la cuenta, según la Política de privacidad. El operador puede suspender o cerrar el acceso si hay abuso, impago de su propia infraestructura, requerimiento legal o riesgo para menores. Al cerrar, el acceso infantil de esa familia deja de funcionar.',
        },
        {
          title: 'Limitación de responsabilidad',
          icon: 'warning-outline',
          tone: 'accent',
          body:
            'En la medida que permita la ley, el operador no responde por lucro cesante, discusiones familiares, dinero que el tutor no entregó, fotos mal usadas por un usuario, ni daños indirectos. La app es una herramienta de registro. Nada en HabitApp sustituye consejo legal, psicológico o financiero. Si la ley de tu país no permite limitar ciertas responsabilidades (por ejemplo, dolo o culpa grave), esas limitaciones no aplican en esa parte.',
        },
        {
          title: 'Privacidad',
          icon: 'lock-closed-outline',
          tone: 'primary',
          body:
            'El tratamiento de datos se rige por la Política de privacidad y, si hay hijos, por «Privacidad y menores». Al usar el servicio también aceptas esas políticas.',
        },
        {
          title: 'Cambios de los términos',
          icon: 'create-outline',
          tone: 'primary',
          body:
            'El operador puede actualizar estos términos si cambia el producto o la ley. Los cambios relevantes se avisarán en la app o por correo cuando sea razonable. Si sigues usando HabitApp después de esa fecha, aceptas la versión nueva, salvo que la ley exija un consentimiento expreso.',
        },
        {
          title: 'Ley y disputas',
          icon: 'globe-outline',
          tone: 'secondary',
          body:
            'Salvo que el operador publique otra cosa en la ficha de la tienda o en su web, se interpreta de acuerdo con las leyes del lugar donde el operador esté establecido o, si no se indica, con las de Ecuador (incluido lo que corresponda en materia de consumidores y de protección de datos). Los tribunales competentes serán los de ese mismo lugar, sin perjuicio de derechos irrenunciables que te otorgue tu país de residencia.',
        },
        {
          title: 'Contacto',
          icon: 'chatbubble-ellipses-outline',
          tone: 'success',
          body:
            'Para dudas sobre estos términos o para ejercer derechos, usa el correo de soporte publicado en App Store, Google Play o la web oficial del operador.',
        },
      ]}
      related={[
        { label: 'Política de privacidad', href: '/(public)/privacy' },
        { label: 'Privacidad y menores', href: '/(public)/privacy-minors' },
        { label: 'Cómo funciona', href: '/(public)/how-it-works' },
      ]}
      disclaimer="Texto de referencia alineado con el funcionamiento actual de HabitApp. No es asesoría legal. El operador debe completar identidad, correo, jurisdicción y revisión con un abogado antes de publicar en tiendas."
    />
  );
}
