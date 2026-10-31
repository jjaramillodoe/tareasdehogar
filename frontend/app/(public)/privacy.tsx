import React from 'react';
import LegalDocument from '../../src/components/LegalDocument';

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Política de privacidad"
      eyebrow="HabitApp · Legal"
      subtitle="Qué datos usa HabitApp, para qué y con quién se comparten."
      heroIcon="shield-checkmark"
      heroTone="primary"
      intro="Esta política describe el tratamiento de datos en HabitApp (tareas familiares, recompensas y metas). Léela junto con los Términos de uso y, si hay menores, «Privacidad y menores». El operador es quien despliega y mantiene el servidor y la base de datos de tu instalación."
      updatedAt="12 ago 2026"
      sections={[
        {
          title: 'Responsable y contacto',
          icon: 'business-outline',
          tone: 'primary',
          body:
            'El responsable del tratamiento es el operador de la instancia de HabitApp que uses (la persona u organización que publica la app y el backend). Los datos se alojan en los servidores y la base de datos que ese operador configure. Para ejercer derechos o hacer preguntas, usa el correo de soporte indicado en la ficha de App Store / Google Play o en la web oficial del operador. Si el operador publica un domicilio o RUC, ese dato prevalece sobre este texto modelo.',
        },
        {
          title: 'Datos que tratamos',
          icon: 'server-outline',
          tone: 'secondary',
          bullets: [
            'Cuenta de padre/tutor: correo, nombre, género opcional (para el avatar), contraseña en forma de hash (no se guarda en texto claro).',
            'Familia: nombre, país, moneda, código de acceso infantil, códigos de invitación y preferencias (notificaciones, horarios silenciosos, límites de retiro, cierre automático de sesión).',
            'Hijos: nombre, edad, alias, género opcional, PIN en hash, saldo y rachas.',
            'Actividad: tareas (título, descripción, monto, fechas, estado, comentarios, calificación), metas, ahorros, logros, pagos y solicitudes de retiro.',
            'Evidencias: fotos que el hijo o el tutor adjuntan para acreditar una tarea. Se comprimen y se guardan en el servidor de la familia; las ve quien pertenece a esa familia.',
            'Dispositivo y sesión: nombre del dispositivo o user-agent, sesiones abiertas y, si activas avisos, el token de notificaciones push (Expo).',
            'Seguridad: dirección IP de forma temporal para limitar intentos de registro, login y códigos; tokens de un solo uso para restablecer contraseña.',
            'Bitácora: eventos de auditoría de la familia (por ejemplo, copias exportadas o cambios relevantes) para que el tutor pueda revisar la actividad.',
          ],
        },
        {
          title: 'Datos que no pedimos',
          icon: 'close-circle-outline',
          tone: 'success',
          bullets: [
            'No pedimos ubicación GPS, contactos, micrófono ni acceso a redes sociales.',
            'No usamos publicidad de terceros ni vendemos listados de usuarios.',
            'No pedimos documentos de identidad, números de tarjeta ni cuentas bancarias: los montos de HabitApp son un registro familiar, no un banco ni un procesador de pagos reales.',
            'El acceso de hijos no usa correo: entra con código de familia y PIN.',
          ],
        },
        {
          title: 'Para qué los usamos',
          icon: 'flag-outline',
          tone: 'success',
          bullets: [
            'Prestar el servicio: crear familia, asignar tareas, aprobar, registrar recompensas y metas.',
            'Identificar al tutor (correo y contraseña) y al hijo (código + PIN).',
            'Mostrar avisos en la app y, si lo autorizas, notificaciones push.',
            'Proteger la cuenta: sesiones, límite de intentos, restablecimiento de contraseña y bitácora.',
            'Permitir al tutor exportar o restaurar un respaldo de la actividad de su familia en su propio dispositivo.',
            'Cumplir obligaciones legales o responder a un requerimiento válido de autoridad, cuando corresponda.',
          ],
        },
        {
          title: 'Base del tratamiento',
          icon: 'document-text-outline',
          tone: 'primary',
          body:
            'Tratamos los datos para ejecutar el contrato de uso del servicio (crear cuenta y usar la app), para seguridad de la cuenta y, cuando la ley lo exija, para cumplir obligaciones legales. El género y el avatar son opcionales. Las notificaciones push y la cámara/galería solo se usan si das permiso en el dispositivo. Si hay menores, el tutor declara tener autoridad para consentir su tratamiento; ver «Privacidad y menores». En Ecuador puede aplicar la Ley Orgánica de Protección de Datos Personales (LOPDP) y su reglamento; en otras regiones, las normas locales equivalentes (por ejemplo, GDPR).',
        },
        {
          title: 'Con quién se comparte',
          icon: 'people-outline',
          tone: 'secondary',
          bullets: [
            'Dentro de la familia: padres/tutores e hijos de esa misma familia ven la actividad que el producto muestra a cada rol. No hay perfiles públicos ni red social.',
            'Proveedor de push: si activas avisos, el token se envía a Expo para entregar la notificación en el teléfono.',
            'Correo de restablecimiento: si el operador configuró Resend (u otro proveedor / webhook), se envía el enlace de «olvidé mi contraseña» a ese servicio.',
            'Alojamiento: el operador puede usar un proveedor de servidores y base de datos (por ejemplo, un hosting y MongoDB) como encargado del tratamiento.',
            'Tiendas: Apple y Google reciben la información que exigen para publicar la app (no el contenido de tu familia).',
            'No vendemos datos a anunciantes ni a brokers. Solo cederíamos información si una autoridad competente lo exige por ley, en la medida estrictamente necesaria.',
          ],
        },
        {
          title: 'Transferencias y lugar de alojamiento',
          icon: 'globe-outline',
          tone: 'primary',
          body:
            'El lugar de almacenamiento lo define el operador (puede estar en Ecuador o en otro país). Si los servidores o Expo/email están fuera de tu país, hay una transferencia internacional. El operador debe usar un proveedor con medidas adecuadas (cifrado en tránsito, acceso restringido). Pregunta al soporte dónde están alojados los datos de tu instancia si necesitas ese detalle para tu familia.',
        },
        {
          title: 'Permisos del teléfono',
          icon: 'phone-portrait-outline',
          tone: 'accent',
          bullets: [
            'Cámara y galería: solo para adjuntar evidencia de una tarea. Puedes completar tareas sin foto.',
            'Notificaciones: opcionales. Si las niegas, sigues usando la app; los avisos quedan en la bandeja interna.',
            'Almacenamiento local: guardamos el token de sesión en el dispositivo para que no tengas que entrar cada vez. Al cerrar sesión se elimina de la app.',
          ],
        },
        {
          title: 'Fotos de evidencia',
          icon: 'camera-outline',
          tone: 'accent',
          body:
            'Las fotos se redimensionan y se guardan en el servidor asociado a tu familia. Están pensadas para que el tutor revise la tarea, no para un álbum público. Evita capturar documentos, caras de terceros o datos sensibles. El tutor puede rechazar una tarea si la imagen no es adecuada. Si se elimina la tarea o se limpia la actividad, la referencia a la foto deja de usarse en la app; el operador puede borrar archivos huérfanos según su política de mantenimiento.',
        },
        {
          title: 'Conservación',
          icon: 'time-outline',
          tone: 'primary',
          body:
            'Los datos se conservan mientras la cuenta y la familia estén activas. Los tokens de restablecimiento caducan a las pocas horas. Las IPs del limitador de intentos se usan de forma temporal en memoria. Si exportas un respaldo JSON, esa copia queda en tu dispositivo y es tu responsabilidad. Puedes borrar hijos, tareas y actividad desde la app (según permisos). Para borrar por completo la cuenta del tutor, solicita al operador la supresión; confirmará la identidad antes de proceder. Puede conservarse lo mínimo exigido por ley (por ejemplo, una reclamación en curso).',
        },
        {
          title: 'Seguridad',
          icon: 'lock-closed-outline',
          tone: 'accent',
          bullets: [
            'Contraseñas y PIN se almacenan con hash (no en texto claro). La contraseña del tutor debe tener al menos 8 caracteres.',
            'La comunicación con el servidor usa HTTPS cuando está bien desplegada.',
            'Hay límite de intentos en login, registro y PIN infantil.',
            'Puedes cerrar otras sesiones desde el perfil del tutor.',
            'Ningún sistema es invulnerable: no compartas la contraseña ni el código de familia con personas ajenas, y no uses el acceso de tutor en el teléfono del hijo.',
          ],
        },
        {
          title: 'Tus derechos',
          icon: 'hand-left-outline',
          tone: 'secondary',
          body:
            'Según la ley que te aplique, puedes solicitar acceso, rectificación, actualización, supresión, oposición, limitación y, cuando corresponda, portabilidad. El tutor puede corregir perfiles de hijos y exportar un respaldo de la actividad familiar desde la app. Para el resto de solicitudes, escribe al soporte del operador. Responderán en los plazos legales tras verificar que eres el titular o el tutor. También puedes reclamar ante la autoridad de protección de datos de tu país (en Ecuador, la autoridad competente en materia de protección de datos personales).',
        },
        {
          title: 'Menores',
          icon: 'heart-outline',
          tone: 'accent',
          body:
            'HabitApp está pensada para que un adulto cree la familia y supervise a los hijos. Los menores no deben abrir la cuenta principal. El detalle de consentimiento, fotos y acceso infantil está en «Privacidad y menores».',
        },
        {
          title: 'Decisiones automatizadas',
          icon: 'hardware-chip-outline',
          tone: 'secondary',
          body:
            'No usamos perfiles crediticios ni decisiones automatizadas con efectos legales sobre ti. Rachas, logros y sugerencias de tareas son mecánicas del juego familiar dentro de la app, bajo control del tutor.',
        },
        {
          title: 'Cambios',
          icon: 'refresh-outline',
          tone: 'secondary',
          body:
            'Esta política puede actualizarse si cambia el producto o la ley. Los cambios relevantes se avisarán en la app o por correo cuando sea razonable. La fecha «Actualizado» al inicio indica la última revisión de este texto.',
        },
      ]}
      related={[
        { label: 'Privacidad y menores', href: '/(public)/privacy-minors' },
        { label: 'Términos de uso', href: '/(public)/terms' },
        { label: 'Cómo funciona', href: '/(public)/how-it-works' },
      ]}
      disclaimer="Texto de referencia alineado con el funcionamiento actual de HabitApp. No es asesoría legal. El operador debe completar identidad, correo de contacto, país de alojamiento y revisión con un abogado (LOPDP, GDPR, COPPA u otras normas que apliquen) antes de publicar en tiendas."
    />
  );
}
