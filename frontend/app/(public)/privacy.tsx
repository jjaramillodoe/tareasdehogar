import React from 'react';
import { Text } from 'react-native';
import { PublicContentLayout } from '../../src/components/PublicContentLayout';
import { legalStyles as s } from '../../src/constants/legalStyles';

export default function PrivacyScreen() {
  return (
    <PublicContentLayout title="Política de privacidad">
      <Text style={s.p}>
        La presente política describe cómo la aplicación HabitApp trata la información en el
        marco del servicio. Debes revisarla junto con los Términos de uso. Si eres padre, madre o tutor,
        también aplica la información específica sobre menores en «Privacidad y menores».
      </Text>

      <Text style={s.h2}>Responsable del tratamiento</Text>
      <Text style={s.p}>
        Los datos se procesan para prestar el servicio de gestión de tareas familiares, recompensas y
        metas. Los servidores y la base de datos configurados por el operador del servicio determinan
        dónde se alojan los datos. Para ejercer derechos (acceso, rectificación, supresión, oposición,
        limitación, portabilidad cuando corresponda) puedes contactar al correo de soporte que publique
        el operador en tiendas o en la web oficial.
      </Text>

      <Text style={s.h2}>Datos que puede tratar la app</Text>
      <Text style={s.bullet}>• Cuenta de padre/tutor: correo, nombre, credenciales de acceso.</Text>
      <Text style={s.bullet}>• Familia e hijos: nombre, edad, alias opcional, PIN opcional para acceso infantil.</Text>
      <Text style={s.bullet}>• Tareas: títulos, estados, comentarios, montos, fechas.</Text>
      <Text style={s.bullet}>
        • Evidencias: imágenes que el hijo adjunte al completar una tarea, visibles en la familia para
        revisión y aprobación.
      </Text>
      <Text style={s.bullet}>• Pagos y metas: movimientos, bonos y retiros según la lógica del servicio.</Text>

      <Text style={s.h2}>Finalidad y base</Text>
      <Text style={s.p}>
        Ejecutar el contrato de uso del servicio, seguridad de la cuenta, cumplimiento de obligaciones
        legales y, en su caso, el interés legítimo en mejorar la experiencia (siempre respetando la
        normativa aplicable en tu país o región).
      </Text>

      <Text style={s.h2}>Conservación</Text>
      <Text style={s.p}>
        Los datos se conservan mientras la cuenta esté activa y el tiempo necesario para obligaciones
        legales o reclamaciones. Puedes solicitar la eliminación de la cuenta conforme al proceso que
        ofrezca el operador.
      </Text>

      <Text style={s.h2}>Seguridad</Text>
      <Text style={s.p}>
        Se utilizan medidas razonables (por ejemplo, conexión cifrada HTTPS y buenas prácticas en el
        servidor). Ningún sistema es 100% invulnerable; usa contraseñas fuertes y no compartas el
        acceso de tutor con hijos.
      </Text>

      <Text style={s.h2}>Cambios</Text>
      <Text style={s.p}>
        Esta política puede actualizarse. Los cambios relevantes se comunicarán por medios razonables
        (por ejemplo, aviso en la app o por correo).
      </Text>

      <Text style={s.disclaimer}>
        Texto modelo de referencia. No constituye asesoría legal; adapta el contenido y el contacto
        conforme a tu jurisdicción y a un abogado especializado.
      </Text>
    </PublicContentLayout>
  );
}
