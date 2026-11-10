import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HeartPulse,
  Users,
  Wallet,
  Lock,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export type TermsTab = 'seguro' | 'salud' | 'retiro' | 'aranceles' | 'privacidad' | 'todos';

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
  const [activeTab, setActiveTab] = useState<TermsTab>('seguro');
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'seguro' as const, label: 'Seguro Obligatorio', icon: ShieldAlert, alert: true },
    { id: 'salud' as const, label: 'Salud y Apto Médico', icon: HeartPulse },
    { id: 'retiro' as const, label: 'Retiro de Menores', icon: Users },
    { id: 'aranceles' as const, label: 'Aranceles y Pagos', icon: Wallet },
    { id: 'privacidad' as const, label: 'Privacidad e Imagen', icon: Lock },
    { id: 'todos' as const, label: 'Texto Completo', icon: FileText },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO */}
        <header className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shrink-0 relative flex items-center justify-between border-b border-purple-700/50">
          <div className="flex items-center gap-3 min-w-0 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-purple-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500/40 border border-purple-300/30 px-2 py-0.5 rounded-full text-purple-100">
                  {isBinding ? 'Aceptación Obligatoria' : 'Marco Normativo'}
                </span>
                <span className="text-[10px] text-purple-200 font-bold">
                  Versión 2026.11
                </span>
              </div>
              <h2
                id="terms-modal-title"
                className="text-base sm:text-lg font-black tracking-tight text-white truncate mt-0.5"
              >
                Reglamento Interno y Términos • VULPIARE
              </h2>
            </div>
          </div>

          {/* Botón cerrar sólo si NO es modo vinculante bloqueante */}
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

        {/* ALERTA CRÍTICA INTRANSIGIBLE DEL SEGURO (Siempre visible en el tope) */}
        <div className="p-3.5 sm:p-4 bg-rose-50 border-b border-rose-200/80 flex items-start gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs text-rose-950 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-[11px] text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                Punto Crítico e Intransigible
              </span>
              <span className="font-extrabold text-rose-900">Seguro de Cobertura Médica</span>
            </div>
            <p className="font-bold leading-snug">
              Es <u>estrictamente obligatorio</u> que la alumna abone el <strong>seguro de accidentes personales / cobertura médica</strong>.
              <span className="block mt-0.5 text-rose-700 font-black">
                SIN EL SEGURO ABONADO NO PODRÁ REALIZAR NINGUNA ACTIVIDAD ACROBÁTICA NI SUBIRSE A LOS ELEMENTOS BAJO NINGUNA CIRCUNSTANCIA.
              </span>
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <nav
          aria-label="Secciones del reglamento"
          className="flex overflow-x-auto gap-1.5 p-2 bg-slate-50 border-b border-purple-100 shrink-0 scrollbar-none"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-sm shadow-purple-200'
                    : 'bg-white text-slate-600 hover:text-purple-800 hover:bg-purple-50/70 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.alert ? 'text-rose-600' : 'text-purple-600'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* CUERPO DEL CONTENIDO CON SCROLL */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed flex-1">
          {/* TAB 1: SEGURO Y SEGURIDAD */}
          {(activeTab === 'seguro' || activeTab === 'todos') && (
            <section className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-900">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">
                  1. Seguridad y Seguro Obligatorio de Accidentes Personales
                </h3>
              </div>
              <div className="space-y-2 text-slate-800 font-medium">
                <p>
                  <strong>1.1. Cobertura Intransigible:</strong> Para salvaguardar la integridad de cada alumna, es requisito <strong>excluyente y obligatorio</strong> abonar la póliza de seguro de accidentes personales / cobertura médica contratada por VULPIARE al momento de iniciar la actividad o anualmente al inicio del ciclo lectivo.
                </p>
                <p className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-950 font-bold">
                  ⚠️ <strong>Prohibición Absoluta:</strong> Aquella alumna que <u>no cuente con el seguro efectivamente abonado y vigente no podrá subir a las telas, liras, trapecios, arneses ni realizar ninguna disciplina aérea ni acrobática</u> dentro de las instalaciones del estudio. Los docentes tienen orden estricta de no admitir excepciones.
                </p>
                <p>
                  <strong>1.2. Protocolos en Sala:</strong> Durante las clases es obligatorio el uso de colchonetas de seguridad homologadas debajo de cada elemento, respetar las instrucciones del equipo docente y mantener una vestimenta deportiva adecuada (sin cierres, joyas ni elementos punzantes que puedan dañar los aparatos o comprometer la seguridad física).
                </p>
              </div>
            </section>
          )}

          {/* TAB 2: SALUD Y APTO MÉDICO */}
          {(activeTab === 'salud' || activeTab === 'todos') && (
            <section className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-900">
                <HeartPulse className="w-5 h-5 text-purple-700 shrink-0" />
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">
                  2. Salud, Aptitud Física y Declaración Médica
                </h3>
              </div>
              <div className="space-y-2 text-slate-800 font-medium">
                <p>
                  <strong>2.1. Certificado Médico Vigente:</strong> Toda alumna debe presentar de forma obligatoria un certificado médico de aptitud física para actividades acrobáticas y de alto rendimiento emitido por un profesional matriculado, con vigencia no mayor a 12 meses.
                </p>
                <p>
                  <strong>2.2. Declaración Jurada:</strong> Los tutores y/o alumnas declaran bajo juramento que no poseen afecciones cardíacas, respiratorias, lesiones osteoarticulares severas ni ninguna contraindicación médica para la práctica de acrobacia aérea en altura e inversión corporal.
                </p>
                <p>
                  <strong>2.3. Deber de Notificación Inmediata:</strong> Cualquier cambio en el estado de salud, traumatismo reciente, mareos recurrentes o prescripción médica sobreviniente debe ser notificado de manera obligatoria y por escrito a la Dirección de VULPIARE antes de ingresar a clase.
                </p>
              </div>
            </section>
          )}

          {/* TAB 3: RETIRO DE MENORES */}
          {(activeTab === 'retiro' || activeTab === 'todos') && (
            <section className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-900">
                <Users className="w-5 h-5 text-purple-700 shrink-0" />
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">
                  3. Seguridad y Protocolo de Retiro de Menores
                </h3>
              </div>
              <div className="space-y-2 text-slate-800 font-medium">
                <p>
                  <strong>3.1. Entrega Exclusiva a Autorizados:</strong> Por la estricta seguridad y custodia de las alumnas menores de edad, VULPIARE <u>únicamente entregará a la alumna a las personas expresamente registradas en el sistema de gestión</u> con nombre completo, DNI y parentesco/vínculo verificado.
                </p>
                <p>
                  <strong>3.2. Acreditación de Identidad Obligatoria:</strong> Al momento del retiro en recepción, el adulto a cargo deberá exhibir su Documento Nacional de Identidad si le es requerido por el personal docente o administrativo. Si la persona no se encuentra registrada en el sistema, la alumna permanecerá en el estudio bajo custodia y se llamará inmediatamente a los tutores legales.
                </p>
                <p>
                  <strong>3.3. Responsabilidad de Actualización:</strong> Es responsabilidad exclusiva e indelegable de los padres o tutores legales mantener debidamente actualizada la lista de personas autorizadas en la base de datos de VULPIARE informando cualquier alta o baja de forma fehaciente.
                </p>
              </div>
            </section>
          )}

          {/* TAB 4: ARANCELES, VENCIMIENTOS Y AUSENCIAS */}
          {(activeTab === 'aranceles' || activeTab === 'todos') && (
            <section className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-900">
                <Wallet className="w-5 h-5 text-purple-700 shrink-0" />
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">
                  4. Aranceles, Vencimientos, Recargos y Recuperatorios
                </h3>
              </div>
              <div className="space-y-2 text-slate-800 font-medium">
                <p>
                  <strong>4.1. Vencimiento de Cuotas:</strong> Las cuotas mensuales vencen indefectiblemente el <strong>día 10 de cada mes</strong>. Hasta las 23:59 hs de dicho día se abona el valor base convenido para cada plan contratado.
                </p>
                <p className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold">
                  ⏳ <strong>Recargo del 10% a partir del Día 11:</strong> A partir de las 00:00 hs del día 11 del mes en curso, se aplicará automáticamente un recargo del 10% por mora administrativa sobre el importe de la cuota mensual.
                </p>
                <p>
                  <strong>4.2. Ausencias No Acumulables:</strong> Las ausencias corresponden al mes calendario en curso y <u>no son acumulables ni trasladables a meses posteriores</u>. El compromiso del arancel mensual reserva el cupo de la vacante independientemente de la concurrencia del alumno.
                </p>
                <p>
                  <strong>4.3. Clases Recuperatorias:</strong> La recuperación de clases perdidas por ausencia justificada está sujeta a la disponibilidad de cupo en turnos afines de la academia y deberá coordinarse previamente a través del portal. Las inasistencias o cancelaciones no generan derecho a reintegro monetario ni descuento de aranceles.
                </p>
              </div>
            </section>
          )}

          {/* TAB 5: PRIVACIDAD Y DERECHOS DE IMAGEN */}
          {(activeTab === 'privacidad' || activeTab === 'todos') && (
            <section className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-900">
                <Lock className="w-5 h-5 text-purple-700 shrink-0" />
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight">
                  5. Protección de Datos y Cesión Institucional de Imagen
                </h3>
              </div>
              <div className="space-y-2 text-slate-800 font-medium">
                <p>
                  <strong>5.1. Confidencialidad de Datos Personales:</strong> Los datos de contacto, teléfonos, comprobantes y antecedentes de salud aportados se encuentran bajo resguardo informático y se emplean exclusivamente con propósitos organizativos, de seguridad interna, contacto de emergencia y control de pagos.
                </p>
                <p>
                  <strong>5.2. Autorización de Imagen Institucional:</strong> Al aceptar el presente reglamento, el tutor y/o la alumna autorizan a VULPIARE a tomar fotografías y registros audiovisuales durante clases regulares, ensayos, muestras y galas anuales, para su difusión con fines pedagógicos, artísticos e institucionales en redes sociales y canales oficiales de la academia.
                </p>
              </div>
            </section>
          )}

          {/* ESTADO DE ACEPTACIÓN PREVIA (Si ya la aceptó en el pasado) */}
          {acceptedAt && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
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
        </div>

        {/* PIE DE PÁGINA / ACCIONES */}
        <footer className="p-4 sm:p-5 bg-slate-50 border-t border-purple-100 shrink-0 flex flex-col gap-3">
          {isBinding ? (
            /* BLOQUE DE ACEPTACIÓN OBLIGATORIA */
            <div className="space-y-3">
              <label
                htmlFor="terms-agree-checkbox"
                className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-purple-200 hover:border-purple-400 cursor-pointer transition-colors shadow-xs"
              >
                <input
                  id="terms-agree-checkbox"
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-slate-800 select-none leading-snug">
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
                Consulta abierta permanente disponible en el Portal de Alumnas y Padres.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs transition-all shadow-md shadow-purple-200 cursor-pointer ml-auto"
              >
                Entendido / Cerrar
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
