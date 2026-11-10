import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBinding?: boolean;
  onAccept?: () => Promise<void> | void;
  isSubmitting?: boolean;
  acceptedAt?: string | null;
  studentName?: string;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  isBinding = false,
  onAccept,
  isSubmitting = false,
  acceptedAt,
  studentName,
}) => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO SIMPLE Y FORMAL */}
        <header className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white shrink-0 relative flex items-center justify-between border-b border-purple-800">
          <div className="flex items-center gap-3 min-w-0 pr-6">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <ShieldAlert className="w-5 h-5 text-purple-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 px-2 py-0.5 rounded-full text-purple-100 border border-purple-400/30">
                  {isBinding ? 'Aceptación Obligatoria' : 'Reglamento Oficial'}
                </span>
                <span className="text-[10px] text-purple-200 font-semibold">
                  Versión 2026.11
                </span>
              </div>
              <h2
                id="terms-modal-title"
                className="text-sm sm:text-base font-black tracking-tight text-white truncate mt-0.5"
              >
                Reglamento Interno, Términos y Condiciones • VULPIARE
              </h2>
            </div>
          </div>

          {!isBinding && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar reglamento"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* CUERPO DEL TEXTO LEGAL CONTINUO (SIN TABS, FLUJO LINEAL DIRECTO) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-[11px] sm:text-xs leading-relaxed flex-1 select-text">
          {/* AVISO DE ACEPTACIÓN PREVIA (Si corresponde) */}
          {acceptedAt && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px] font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Reglamento aceptado con valor de declaración jurada el{' '}
                {new Date(acceptedAt).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                {studentName ? `para ${studentName}` : ''}.
              </span>
            </div>
          )}

          {/* PUNTO CRÍTICO DEL SEGURO EN EL TOPE */}
          <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-800 font-black uppercase text-[11px] tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Punto Crítico e Intransigible: Seguro de Cobertura Médica</span>
            </div>
            <p className="font-bold text-[11px] sm:text-xs leading-normal">
              Es estrictamente obligatorio que la alumna abone el <strong>seguro de accidentes personales / cobertura médica</strong>.
              <span className="block mt-1 text-rose-700 font-black">
                SIN EL SEGURO ABONADO NO PODRÁ REALIZAR NINGUNA ACTIVIDAD ACROBÁTICA NI SUBIRSE A LOS ELEMENTOS BAJO NINGUNA CIRCUNSTANCIA.
              </span>
              La academia prioriza de forma absoluta la integridad física de las alumnas y no se admitirán excepciones bajo ninguna justificación.
            </p>
          </div>

          {/* TEXTO CONTINUO DEL REGLAMENTO */}
          <div className="space-y-4 pt-1 divide-y divide-slate-100">
            {/* ARTÍCULO 1 */}
            <div className="space-y-1.5 pt-2">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                1. Seguridad y Seguro Obligatorio de Accidentes Personales
              </h3>
              <p>
                <strong>1.1. Cobertura médica excluyente:</strong> Para salvaguardar la integridad de cada alumna, es requisito obligatorio abonar la póliza de seguro de accidentes personales contratada por VULPIARE al momento de la inscripción o anualmente al inicio del ciclo lectivo.
              </p>
              <p>
                <strong>1.2. Prohibición de práctica sin seguro:</strong> La alumna que no cuente con el seguro efectivamente abonado y vigente no podrá subir a las telas, liras, trapecios, arneses ni realizar ninguna disciplina acrobática o aérea dentro de las instalaciones del estudio.
              </p>
              <p>
                <strong>1.3. Protocolo en sala:</strong> Es obligatorio el uso de colchonetas de seguridad homologadas debajo de cada aparato, respetar estrictamente las indicaciones del equipo docente y concurrir con indumentaria deportiva adecuada (sin cierres, botones metálicos ni joyas que puedan dañar los elementos o comprometer la seguridad física).
              </p>
            </div>

            {/* ARTÍCULO 2 */}
            <div className="space-y-1.5 pt-3">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                2. Salud, Aptitud Física y Declaración Médica
              </h3>
              <p>
                <strong>2.1. Certificado médico vigente:</strong> Toda alumna debe presentar de forma obligatoria un certificado médico de aptitud física para actividades acrobáticas y de esfuerzo físico expedido por un profesional matriculado, con vigencia no mayor a 12 meses.
              </p>
              <p>
                <strong>2.2. Declaración jurada de salud:</strong> Los tutores y/o alumnas declaran bajo juramento que no poseen afecciones cardíacas, respiratorias, lesiones osteoarticulares severas ni contraindicaciones médicas para la práctica de acrobacia aérea en altura e inversión corporal.
              </p>
              <p>
                <strong>2.3. Deber de aviso inmediato:</strong> Cualquier cambio en el estado de salud, lesión reciente, mareos recurrentes o prescripción médica sobreviniente debe ser notificado de manera inmediata por escrito a la Dirección antes de ingresar a clase.
              </p>
            </div>

            {/* ARTÍCULO 3 */}
            <div className="space-y-1.5 pt-3">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                3. Seguridad y Protocolo de Retiro de Menores
              </h3>
              <p>
                <strong>3.1. Entrega exclusiva a personas autorizadas:</strong> Por la seguridad y custodia de las alumnas menores de edad, VULPIARE únicamente entregará a la alumna a las personas registradas en el sistema de gestión con nombre completo, DNI y parentesco o vínculo verificado.
              </p>
              <p>
                <strong>3.2. Acreditación obligatoria con DNI:</strong> Al momento del retiro en recepción, el adulto a cargo deberá exhibir su Documento Nacional de Identidad. En caso de que la persona no figure registrada en el sistema, la alumna permanecerá en el estudio bajo custodia y se comunicará inmediatamente a los tutores legales.
              </p>
              <p>
                <strong>3.3. Responsabilidad de actualización:</strong> Es responsabilidad exclusiva de los padres o tutores legales mantener debidamente actualizada la lista de personas autorizadas en la base de datos de VULPIARE informando cualquier cambio de forma fehaciente.
              </p>
            </div>

            {/* ARTÍCULO 4 */}
            <div className="space-y-1.5 pt-3">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                4. Aranceles, Vencimientos, Recargos y Ausencias
              </h3>
              <p>
                <strong>4.1. Vencimiento de cuotas:</strong> Las cuotas mensuales vencen indefectiblemente el día 10 de cada mes (hasta las 23:59 hs se abona la tarifa base convenida).
              </p>
              <p>
                <strong>4.2. Recargo administrativo desde el día 11:</strong> A partir de las 00:00 hs del día 11 del mes en curso rige automáticamente un recargo del 10% por mora administrativa sobre el importe de la cuota mensual.
              </p>
              <p>
                <strong>4.3. Ausencias no acumulables:</strong> Las inasistencias corresponden al mes calendario en curso y no son acumulables ni trasladables a meses posteriores. El abono mensual reserva el cupo de la vacante independientemente de la concurrencia de la alumna.
              </p>
              <p>
                <strong>4.4. Clases recuperatorias y reembolsos:</strong> La recuperación de clases perdidas por ausencia justificada está sujeta a la disponibilidad de cupos en turnos afines y debe coordinarse con reserva previa a través del portal. Las ausencias o cancelaciones no dan derecho a reintegros monetarios ni deducción de cuotas. Los aranceles abonados no son transferibles ni reembolsables.
              </p>
            </div>

            {/* ARTÍCULO 5 */}
            <div className="space-y-1.5 pt-3">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                5. Privacidad, Confidencialidad y Derechos de Imagen
              </h3>
              <p>
                <strong>5.1. Tratamiento confidencial de datos:</strong> Los datos de contacto, teléfonos, comprobantes de pago e información médica aportada están bajo estricto resguardo y se emplean exclusivamente para la administración interna, contacto de emergencia, seguridad y control de pagos.
              </p>
              <p>
                <strong>5.2. Cesión institucional de imagen:</strong> Al prestar conformidad al presente reglamento, los tutores y/o alumnas autorizan a VULPIARE a realizar registros fotográficos y audiovisuales durante clases, ensayos, muestras y galas anuales, para su difusión institucional con fines pedagógicos y artísticos en canales y redes oficiales de la academia.
              </p>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA / ACCIONES */}
        <footer className="p-4 sm:p-5 bg-slate-50 border-t border-purple-100 shrink-0 flex flex-col gap-3">
          {isBinding ? (
            /* BLOQUE DE ACEPTACIÓN VINCULANTE */
            <div className="space-y-3">
              <label
                htmlFor="terms-agree-checkbox"
                className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-purple-200 hover:border-purple-300 cursor-pointer transition-colors shadow-xs"
              >
                <input
                  id="terms-agree-checkbox"
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer shrink-0"
                />
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 select-none leading-snug">
                  He leído, comprendo y acepto el <u>Reglamento Interno</u>, la <strong>obligatoriedad del pago del seguro para realizar actividades</strong> y los <u>Términos y Condiciones</u> de VULPIARE.
                </span>
              </label>

              <button
                type="button"
                disabled={!hasAgreed || isSubmitting}
                onClick={onAccept}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  hasAgreed && !isSubmitting
                    ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-200 active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando aceptación vinculante...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Continuar</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* BLOQUE DE CONSULTA ABIERTA */
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Consulta permanente accesible desde el pie de página del Portal de Alumnas y Padres.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs transition-all shadow-md shadow-purple-200 cursor-pointer ml-auto"
              >
                Entendido
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
