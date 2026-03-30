import React from 'react';
import { Text } from 'react-native';
import { PublicContentLayout } from '../../src/components/PublicContentLayout';
import { legalStyles as s } from '../../src/constants/legalStyles';

export default function PrivacyMinorsScreen() {
  return (
    <PublicContentLayout title="Privacidad y menores">
      <Text style={s.p}>
        HabitApp puede ser usada por familias con hijos menores de edad. Esta sección resume
        compromisos y buenas prácticas. Debe leerse junto con la Política de privacidad general y los
        Términos de uso.
      </Text>

      <Text style={s.h2}>Quién debe crear la cuenta</Text>
      <Text style={s.p}>
        La cuenta de padre, madre o tutor legal debe ser creada y gestionada por un adulto con capacidad
        legal. Los menores no deben registrarse como titulares de la cuenta principal de la familia.
      </Text>

      <Text style={s.h2}>Acceso de los hijos</Text>
      <Text style={s.p}>
        El acceso «como hijo/a» utiliza el código de familia generado por el tutor y, opcionalmente, un
        PIN configurado por el tutor en el perfil del menor. El tutor puede revocar o cambiar esos
        mecanismos en cualquier momento.
      </Text>

      <Text style={s.h2}>Datos de menores</Text>
      <Text style={s.p}>
        Solo se recogen datos necesarios para el servicio: nombre, edad, alias opcional, actividad de
        tareas, saldo y, si el menor o el flujo lo permite, fotos de evidencia de tareas para revisión
        familiar. No se debe pedir a menores datos innecesarios fuera de este propósito.
      </Text>

      <Text style={s.h2}>Consentimiento del titular de la patria potestad</Text>
      <Text style={s.p}>
        El tutor que configura hijos en la app declara que tiene autoridad para consentir el tratamiento
        de datos de los menores a su cargo en el marco del servicio, conforme a la legislación aplicable
        en su país o región (incluidas normas de protección infantil y privacidad).
      </Text>

      <Text style={s.h2}>Fotos y evidencias</Text>
      <Text style={s.p}>
        Las imágenes deben mostrar únicamente lo razonable para acreditar una tarea del hogar. Se
        desaconseja incluir datos sensibles o terceros identificables sin necesidad. El tutor puede
        rechazar tareas si la evidencia no es adecuada.
      </Text>

      <Text style={s.h2}>Derechos</Text>
      <Text style={s.p}>
        Los titulares del ejercicio parental pueden solicitar acceso, rectificación o supresión de datos
        del menor, y el operador atenderá las peticiones según la normativa aplicable y la verificación
        de identidad del solicitante.
      </Text>

      <Text style={s.h2}>Tiendas de aplicaciones</Text>
      <Text style={s.p}>
        Apple y Google pueden exigir políticas de privacidad, clasificación por edad y declaraciones
        sobre datos de menores. Publica una URL de política de privacidad actualizada y cumple las
        guías de cada tienda al enviar la app a revisión.
      </Text>

      <Text style={s.disclaimer}>
        Documento orientativo. Revísalo con asesoría legal para cumplir COPPA, GDPR, normas locales de
        Ecuador u otras que apliquen a tu despliegue.
      </Text>
    </PublicContentLayout>
  );
}
