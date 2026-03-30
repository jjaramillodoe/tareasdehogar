import React from 'react';
import { Text } from 'react-native';
import { PublicContentLayout } from '../../src/components/PublicContentLayout';
import { legalStyles as s } from '../../src/constants/legalStyles';

export default function TermsScreen() {
  return (
    <PublicContentLayout title="Términos de uso">
      <Text style={s.p}>
        Al usar la aplicación HabitApp aceptas estos términos. Si no estás de acuerdo, no uses
        el servicio. El titular del servicio es quien despliegue y opere el backend y la infraestructura
        asociada (el «operador»).
      </Text>

      <Text style={s.h2}>Descripción del servicio</Text>
      <Text style={s.p}>
        La app permite gestionar tareas del hogar, recompensas, metas y pagos simulados o registrados
        dentro de la familia. Las funciones exactas dependen de la versión desplegada.
      </Text>

      <Text style={s.h2}>Elegibilidad</Text>
      <Text style={s.p}>
        La cuenta principal debe ser creada por un adulto con capacidad legal. Los perfiles de hijos
        están sujetos a la supervisión del tutor. El uso por menores se limita al flujo «hijo/a» con
        código de familia y reglas definidas por el tutor.
      </Text>

      <Text style={s.h2}>Cuenta y seguridad</Text>
      <Text style={s.p}>
        Eres responsable de mantener la confidencialidad de tu contraseña y del código de familia. Debes
        notificar de inmediato el uso no autorizado. El operador puede suspender cuentas que vulneren
        estos términos o la ley.
      </Text>

      <Text style={s.h2}>Contenido y conducta</Text>
      <Text style={s.p}>
        No utilices la app para contenido ilegal, acoso, mensajes ofensivos o evidencias que no
        correspondan a tareas del hogar. El tutor puede moderar y rechazar tareas.
      </Text>

      <Text style={s.h2}>Limitación de responsabilidad</Text>
      <Text style={s.p}>
        El servicio se ofrece «tal cual» en la medida permitida por la ley. El operador no garantiza
        disponibilidad ininterrumpida ni ausencia de errores. Los montos y recompensas son acuerdos
        familiares; la app es una herramienta de registro y flujo, salvo que se acuerde lo contrario por
        escrito.
      </Text>

      <Text style={s.h2}>Modificaciones</Text>
      <Text style={s.p}>
        Los términos pueden actualizarse. El uso continuado tras el aviso implica aceptación de los
        cambios sustanciales cuando la ley lo permita.
      </Text>

      <Text style={s.h2}>Ley aplicable</Text>
      <Text style={s.p}>
        La ley aplicable y la jurisdicción competente las define el operador en su documentación oficial
        o las partes acuerdan conforme a las normas del lugar de residencia del usuario cuando corresponda.
      </Text>

      <Text style={s.disclaimer}>
        Borrador genérico. Sustituye referencias al operador, contacto y jurisdicción con datos reales y
        revisión jurídica antes de publicar en tiendas.
      </Text>
    </PublicContentLayout>
  );
}
