import React from 'react';
import LegalDocument from '../../src/components/LegalDocument';

export default function PrivacyMinorsScreen() {
  return (
    <LegalDocument
      title="Privacidad y menores"
      eyebrow="HabitApp · Familias"
      subtitle="Cómo protegemos los datos de los hijos y qué controla el tutor."
      heroIcon="heart"
      heroTone="accent"
      intro="HabitApp está hecha para que un adulto cree la familia y supervise a los menores. Este texto detalla el tratamiento de datos de hijos y se lee junto con la Política de privacidad y los Términos. El operador es quien despliega el servidor; el tutor es quien consiente y controla los perfiles infantiles."
      updatedAt="12 ago 2026"
      sections={[
        {
          title: 'A quién va dirigido',
          icon: 'people-outline',
          tone: 'accent',
          body:
            'Este documento es para padres, madres y tutores legales. Los menores usan HabitApp solo con permiso y bajo la cuenta familiar del adulto. No está pensada como red social ni como app que el niño instale y registre solo con su correo.',
        },
        {
          title: 'Quién debe crear la cuenta',
          icon: 'person-circle-outline',
          tone: 'accent',
          body:
            'La cuenta principal (correo y contraseña) la crea un adulto con capacidad legal. Un menor no debe registrarse como «padre/tutor» ni usar el correo del adulto para saltarse esa regla. El tutor es responsable de los perfiles que añada y de cómo el hijo usa el teléfono.',
        },
        {
          title: 'Cómo entra el hijo',
          icon: 'key-outline',
          tone: 'primary',
          bullets: [
            'No pedimos correo ni contraseña al menor.',
            'Entra con el código de familia que le da el tutor y el PIN de su perfil (mínimo 4 dígitos, guardado como hash).',
            'El tutor puede cambiar el PIN, regenerar o no compartir el código, o borrar el perfil.',
            'Hay límite de intentos de PIN: si fallan varias veces, el acceso se bloquea un tiempo.',
            'La lista pública de nombres al poner el código solo muestra nombre, alias y género para el avatar; no muestra saldo ni fotos.',
          ],
        },
        {
          title: 'Qué datos del menor se guardan',
          icon: 'server-outline',
          tone: 'secondary',
          bullets: [
            'Identidad en la familia: nombre, edad, alias opcional, género opcional (solo para elegir avatar).',
            'Acceso: PIN en hash y, si el dispositivo lo autoriza, token de notificaciones push.',
            'Actividad: tareas asignadas, estados, comentarios, montos, fechas, calificación y comentarios del tutor.',
            'Evidencias: fotos que el hijo o el tutor adjuntan para acreditar una tarea.',
            'Economía familiar virtual: saldo, pagos, metas de ahorro, retiros pedidos, logros y rachas.',
            'Avisos internos de la app (tarea aprobada, meta, logro, etc.).',
          ],
        },
        {
          title: 'Qué no pedimos al menor',
          icon: 'close-circle-outline',
          tone: 'success',
          bullets: [
            'No pedimos correo, redes sociales, ubicación GPS, contactos ni micrófono.',
            'No pedimos documentos de identidad, fotos escolares ni datos de salud.',
            'No pedimos tarjetas, cuentas bancarias ni dinero real: el «saldo» es un registro entre la familia.',
            'No creamos un perfil público ni un chat con extraños.',
          ],
        },
        {
          title: 'Para qué los usamos',
          icon: 'flag-outline',
          tone: 'success',
          bullets: [
            'Que el hijo vea sus tareas, complete, pida retiro o avance metas, según lo que el tutor haya configurado.',
            'Que el tutor apruebe, rechace, pague y revise evidencias.',
            'Mostrar avisos en la app y, si hay permiso, una notificación en el teléfono.',
            'Calcular rachas, logros y reportes familiares (solo dentro de esa familia).',
            'Proteger el acceso (PIN, límite de intentos, sesiones).',
          ],
        },
        {
          title: 'Consentimiento del tutor',
          icon: 'checkmark-done-outline',
          tone: 'success',
          body:
            'Al crear un perfil de hijo, el adulto declara que es padre, madre o tutor legal (o tiene autoridad equivalente) y consiente el tratamiento de esos datos para el servicio. Ese consentimiento se puede retirar borrando el perfil o pidiendo al operador la supresión. En Ecuador aplica la LOPDP y las normas de protección de niños, niñas y adolescentes. Si hay usuarios en la UE, puede aplicar el GDPR (el consentimiento lo da el titular de la patria potestad). Si el servicio se ofrece hacia Estados Unidos, puede aplicar COPPA: HabitApp no está dirigida a que un menor menor de 13 años se registre solo; el adulto debe crear y controlar el perfil.',
        },
        {
          title: 'Con quién se comparte',
          icon: 'people-outline',
          tone: 'secondary',
          bullets: [
            'Solo la familia: tutores e hijos de esa misma familia ven lo que cada rol puede ver. Un hijo no ve el correo del tutor ni el PIN de un hermano.',
            'Expo (push): solo el token del dispositivo, si las notificaciones están activadas, para entregar el aviso.',
            'Alojamiento: el servidor y la base de datos que configure el operador (encargado del tratamiento).',
            'No vendemos datos de menores a anunciantes, escuelas, ni brokers. No hay anuncios de terceros en la experiencia infantil.',
            'Solo cederíamos datos si una autoridad competente lo exige por ley, en lo estrictamente necesario.',
          ],
        },
        {
          title: 'Dónde se alojan',
          icon: 'globe-outline',
          tone: 'primary',
          body:
            'El país del servidor lo define el operador. Puede estar en Ecuador o en otro lugar (incluida una transferencia internacional). Pregunta al soporte de tu instancia si necesitas esa ubicación para tu familia. El operador debe usar cifrado en tránsito (HTTPS) y acceso restringido.',
        },
        {
          title: 'Permisos en el teléfono del hijo',
          icon: 'phone-portrait-outline',
          tone: 'accent',
          bullets: [
            'Cámara o galería: opcionales, solo para evidencia de una tarea. Se puede marcar «completada» sin foto.',
            'Notificaciones: opcionales. Si se niegan, el hijo sigue usando la app; los avisos quedan en la bandeja interna.',
            'Sesión: se guarda un token en el dispositivo para no pedir el PIN cada vez. Al salir, se borra de la app. El tutor puede forzar cierre con el cierre automático de sesión de la familia.',
          ],
        },
        {
          title: 'Fotos de evidencia',
          icon: 'camera-outline',
          tone: 'accent',
          body:
            'Las fotos se comprimen y se guardan en el servidor de la familia para que el tutor revise la tarea. No son un álbum público. El tutor debe enseñar al hijo a no fotografiar documentos, desnudos, caras de terceros ni datos sensibles. El tutor puede rechazar la tarea si la imagen no es adecuada. Si se borra la tarea o el perfil, la app deja de mostrar esa evidencia; el operador puede limpiar archivos huérfanos en el mantenimiento del servidor.',
        },
        {
          title: 'Saldo, metas y retiros',
          icon: 'wallet-outline',
          tone: 'secondary',
          body:
            'Los montos son un acuerdo familiar registrado en la app, no un pago electrónico ni un banco. Un retiro lo pide el hijo y lo aprueba o rechaza el tutor. HabitApp no transfiere dinero real ni guarda datos de tarjetas. El tutor decide si entrega efectivo u otra recompensa fuera de la app.',
        },
        {
          title: 'Conservación y borrado',
          icon: 'time-outline',
          tone: 'primary',
          body:
            'Los datos del hijo se conservan mientras el perfil y la familia existan. El tutor puede editar o eliminar el perfil del hijo en la app (eso quita el acceso infantil). También puede exportar un respaldo de la actividad familiar a su propio dispositivo; esa copia queda bajo su cuidado. Para borrar de raíz los datos en el servidor, el tutor pide al operador la supresión, con verificación de que es el adulto responsable. Puede conservarse lo mínimo que exija la ley (por ejemplo, una reclamación abierta).',
        },
        {
          title: 'Seguridad del acceso infantil',
          icon: 'lock-closed-outline',
          tone: 'accent',
          bullets: [
            'El PIN no se guarda en texto claro.',
            'No compartas el código de familia en grupos públicos ni en la escuela sin control.',
            'No dejes la sesión del tutor abierta en el teléfono del hijo.',
            'Usa un PIN que el niño recuerde pero que un hermano no adivine al primer intento; cámbialo si deja de ser secreto.',
            'Ningún sistema es infalible: el tutor sigue siendo quien vigila el uso cotidiano.',
          ],
        },
        {
          title: 'Sin publicidad ni red social',
          icon: 'megaphone-outline',
          tone: 'success',
          body:
            'No mostramos anuncios de terceros a los niños, no rastreamos para marketing y no hay un feed público. La actividad del menor la ve su familia en HabitApp. No hay chat con desconocidos ni «seguir» a otras familias.',
        },
        {
          title: 'Decisiones automatizadas',
          icon: 'hardware-chip-outline',
          tone: 'secondary',
          body:
            'No hay scoring crediticio ni decisiones automáticas con efecto legal sobre el menor. Rachas, logros y misiones son mecánicas de juego que el tutor puede ignorar, editar o apagar según las funciones de la app. Aprobar una tarea o un retiro lo hace siempre un adulto.',
        },
        {
          title: 'Derechos (los ejerce el tutor)',
          icon: 'hand-left-outline',
          tone: 'secondary',
          body:
            'El menor no gestiona solo una cuenta de correo en HabitApp. El tutor puede acceder, rectificar, actualizar o suprimir los datos del hijo, oponerse o pedir limitación y, cuando la ley lo permita, una copia (por ejemplo el respaldo de actividad). Escribe al correo de soporte de la ficha de la tienda o de la web del operador. También puedes acudir a la autoridad de protección de datos de tu país (en Ecuador, la autoridad competente en la materia) y, si aplica, a las autoridades de protección de la niñez.',
        },
        {
          title: 'Tiendas de aplicaciones',
          icon: 'phone-portrait-outline',
          tone: 'accent',
          body:
            'Apple y Google exigen política de privacidad, edad orientativa y declaraciones sobre datos de menores. El operador debe publicar esta URL, marcar que hay datos de niños bajo consentimiento parental y no reclamar «no hay datos de menores» si la app tiene perfiles de hijos.',
        },
        {
          title: 'Cambios',
          icon: 'refresh-outline',
          tone: 'secondary',
          body:
            'Si cambia el producto o la ley, actualizaremos este texto. Los cambios relevantes se avisarán en la app cuando sea razonable. La fecha «Actualizado» indica la última revisión.',
        },
      ]}
      related={[
        { label: 'Política de privacidad', href: '/(public)/privacy' },
        { label: 'Términos de uso', href: '/(public)/terms' },
        { label: 'Cómo funciona', href: '/(public)/how-it-works' },
      ]}
      disclaimer="Texto de referencia alineado con el flujo infantil actual de HabitApp. No es asesoría legal. El operador debe completar identidad, correo de contacto y revisión con un abogado (LOPDP, protección de NNA en Ecuador, GDPR, COPPA u otras normas) antes de publicar en tiendas."
    />
  );
}
