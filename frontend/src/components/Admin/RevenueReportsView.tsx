import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  CreditCard,
  Banknote,
  DollarSign,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { AdminUser, PaymentRecord, Student, FixedExpense, PaymentConcept } from '../../types';
import { getPayments, getStudents, getExpenses, getPaymentConcepts } from '../../services/api';
import { trackFinancialReportViewed, trackReportExported } from '../../services/analytics';

interface RevenueReportsViewProps {
  user: AdminUser;
  onNavigateToExpenses?: () => void;
}

export const RevenueReportsView: React.FC<RevenueReportsViewProps> = ({
  user,
  onNavigateToExpenses,
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [concepts, setConcepts] = useState<PaymentConcept[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Vista Mensual vs Anual
  const [viewScope, setViewScope] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // Mes seleccionado (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Rango y desplazamiento para el gráfico mensual (6M vs 12M y paginado)
  const [chartMonthsRange, setChartMonthsRange] = useState<'6M' | '12M'>('6M');
  const [chartMonthOffset, setChartMonthOffset] = useState<number>(0);

  // Desplazamiento para el gráfico anual (paginado de años)
  const [chartYearOffset, setChartYearOffset] = useState<number>(0);

  // Filtro por concepto
  const [conceptFilter, setConceptFilter] = useState<string>('TODOS');

  // Estado de feedback de exportación
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, studentsData, expensesData, conceptsData] = await Promise.all([
        getPayments(),
        getStudents(),
        getExpenses(),
        getPaymentConcepts().catch(() => []),
      ]);
      setPayments(paymentsData || []);
      setStudents(studentsData || []);
      setExpenses(expensesData || []);
      setConcepts(conceptsData || []);
    } catch (err) {
      console.error('Error al cargar datos financieros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Año seleccionado y etiquetas de período
  const selectedYear = useMemo(() => {
    return selectedMonth.split('-')[0] || String(new Date().getFullYear());
  }, [selectedMonth]);

  // Formateador de mes (ej. "Noviembre 2026")
  const formatMonthNice = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    if (!y || !m) return monthStr;
    const dateObj = new Date(y, m - 1, 1);
    const formatted = dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Etiqueta del período activo (Mes o Año según viewScope)
  const displayPeriodLabel = useMemo(() => {
    if (viewScope === 'ANNUAL') {
      return `Año ${selectedYear}`;
    }
    return formatMonthNice(selectedMonth);
  }, [viewScope, selectedYear, selectedMonth]);

  // Navegación de período (mes a mes en Mensual, año a año en Anual)
  const handlePrevPeriod = () => {
    if (viewScope === 'ANNUAL') {
      const y = Number(selectedYear);
      const m = selectedMonth.split('-')[1] || '01';
      setSelectedMonth(`${y - 1}-${m}`);
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      const prev = new Date(y, m - 2, 1);
      setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextPeriod = () => {
    if (viewScope === 'ANNUAL') {
      const y = Number(selectedYear);
      const m = selectedMonth.split('-')[1] || '01';
      setSelectedMonth(`${y + 1}-${m}`);
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      const next = new Date(y, m, 1);
      setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  // Período anterior para cálculo de comparativa %
  const previousMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const previousYearStr = useMemo(() => {
    return String(Number(selectedYear) - 1);
  }, [selectedYear]);

  // Alumnas activas (las que deben pagar cuota)
  const activeStudents = useMemo(() => {
    return students.filter((s) => !s.status || s.status === 'ACTIVE');
  }, [students]);

  // Arancel estándar de cuota
  const defaultFee = useMemo(() => {
    const activeConcept = concepts.find((c) => c.isActive && c.name.toLowerCase().includes('cuota'));
    return activeConcept?.amount || 22000;
  }, [concepts]);

  // Pagos filtrados por período
  const filteredPayments = useMemo(() => {
    let list = payments;
    if (viewScope === 'MONTHLY') {
      list = list.filter((p) => p.month === selectedMonth);
    } else {
      const year = selectedMonth.split('-')[0];
      list = list.filter((p) => p.month.startsWith(year));
    }

    if (conceptFilter !== 'TODOS') {
      list = list.filter((p) => {
        const cName = (p.concept || '').toLowerCase();
        if (conceptFilter === 'CUOTA') return cName.includes('cuota');
        if (conceptFilter === 'MATRICULA') return cName.includes('matrícula') || cName.includes('matricula');
        if (conceptFilter === 'SUELTA') return cName.includes('suelta') || cName.includes('pase');
        return true;
      });
    }

    return list;
  }, [payments, selectedMonth, viewScope, conceptFilter]);

  // Recaudación del período anterior para comparativa
  const prevPeriodRevenue = useMemo(() => {
    if (viewScope === 'MONTHLY') {
      return payments
        .filter((p) => p.month === previousMonthStr)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    } else {
      return payments
        .filter((p) => p.month.startsWith(previousYearStr))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    }
  }, [payments, viewScope, previousMonthStr, previousYearStr]);

  // Gastos del período
  const filteredExpenses = useMemo(() => {
    if (viewScope === 'MONTHLY') {
      return expenses.filter((e) => e.month === selectedMonth);
    }
    const year = selectedMonth.split('-')[0];
    return expenses.filter((e) => e.month.startsWith(year));
  }, [expenses, selectedMonth, viewScope]);

  // =========================================================================
  // CÁLCULO DE KPIS
  // =========================================================================
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPayments]);

  const revenueVariationPercent = useMemo(() => {
    if (prevPeriodRevenue === 0) return totalRevenue > 0 ? 100 : 0;
    return Math.round(((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100);
  }, [totalRevenue, prevPeriodRevenue]);

  // Total Gastos
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Balance Neto (Ingresos - Gastos)
  const netBalance = totalRevenue - totalExpenses;

  // Alumnas que pagaron en el mes seleccionado
  const paidStudentIds = useMemo(() => {
    return new Set(filteredPayments.map((p) => p.studentId));
  }, [filteredPayments]);

  const paidCount = paidStudentIds.size;
  const activeCount = activeStudents.length || 1;
  const paymentRatePercent = Math.min(100, Math.round((paidCount / activeCount) * 100));

  // Mora / Pendiente
  const unpaidStudents = useMemo(() => {
    return activeStudents.filter((s) => !paidStudentIds.has(s.id));
  }, [activeStudents, paidStudentIds]);

  const pendingDebtAmount = unpaidStudents.length * defaultFee;

  // Ticket Promedio
  const averageTicket = useMemo(() => {
    if (paidCount === 0) return defaultFee;
    return Math.round(totalRevenue / paidCount);
  }, [totalRevenue, paidCount, defaultFee]);

  // =========================================================================
  // DESGLOSE POR MEDIO DE PAGO
  // =========================================================================
  const paymentMethodStats = useMemo(() => {
    let transferSum = 0;
    let cashSum = 0;

    filteredPayments.forEach((p) => {
      if (p.paymentMethod === 'TRANSFER') transferSum += p.amount || 0;
      else cashSum += p.amount || 0;
    });

    const total = transferSum + cashSum || 1;
    const transferPct = Math.round((transferSum / total) * 100);
    const cashPct = 100 - transferPct;

    return {
      transfer: { amount: transferSum, percent: transferPct },
      cash: { amount: cashSum, percent: cashPct },
    };
  }, [filteredPayments]);

  // =========================================================================
  // INGRESOS POR CONCEPTO
  // =========================================================================
  const conceptStats = useMemo(() => {
    let cuotasSum = 0;
    let matriculasSum = 0;
    let sueltasSum = 0;

    filteredPayments.forEach((p) => {
      const c = (p.concept || '').toLowerCase();
      if (c.includes('matrícula') || c.includes('matricula')) {
        matriculasSum += p.amount || 0;
      } else if (c.includes('suelta') || c.includes('pase')) {
        sueltasSum += p.amount || 0;
      } else {
        cuotasSum += p.amount || 0;
      }
    });

    const total = cuotasSum + matriculasSum + sueltasSum || 1;

    return [
      {
        name: 'Cuotas Mensuales',
        subtitle: 'Acrobacia, Pole & Danza',
        amount: cuotasSum,
        percent: Math.round((cuotasSum / total) * 100),
        color: 'bg-purple-600',
        textColor: 'text-purple-700',
      },
      {
        name: 'Matrículas Anuales',
        subtitle: 'Inscripciones y seguros anuales',
        amount: matriculasSum,
        percent: Math.round((matriculasSum / total) * 100),
        color: 'bg-pink-600',
        textColor: 'text-pink-700',
      },
      {
        name: 'Pases Libres / Sueltas',
        subtitle: 'Clases de prueba y talleres especiales',
        amount: sueltasSum,
        percent: Math.round((sueltasSum / total) * 100),
        color: 'bg-amber-600',
        textColor: 'text-amber-700',
      },
    ];
  }, [filteredPayments]);

  // =========================================================================
  // EVOLUCIÓN HISTÓRICA DE INGRESOS (MENSUAL O ANUAL)
  // =========================================================================
  // Gráfico de evolución mensual (6M o 12M con soporte de desplazamiento hacia meses anteriores)
  const monthlyTrend = useMemo(() => {
    const result: Array<{
      key: string;
      label: string;
      sublabel?: string;
      amount: number;
      isCurrent: boolean;
      tooltip: string;
    }> = [];
    const count = chartMonthsRange === '6M' ? 6 : 12;
    const [y, m] = selectedMonth.split('-').map(Number);

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i - chartMonthOffset, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthPayments = payments.filter((p) => p.month === mStr);
      const sum = monthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const label = d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase().replace('.', '');
      const yearShort = `'${String(d.getFullYear()).slice(2)}`;
      const niceName = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

      result.push({
        key: mStr,
        label,
        sublabel: chartMonthsRange === '12M' || d.getFullYear() !== y ? yearShort : undefined,
        amount: sum,
        isCurrent: mStr === selectedMonth,
        tooltip: `${niceName.charAt(0).toUpperCase() + niceName.slice(1)}: $${sum.toLocaleString('es-AR')}`,
      });
    }

    const maxAmount = Math.max(...result.map((r) => r.amount), 1);

    return result.map((item) => ({
      ...item,
      heightPercent: Math.max(12, Math.round((item.amount / maxAmount) * 92)),
      isRecord: item.amount === maxAmount && maxAmount > 0,
    }));
  }, [payments, selectedMonth, chartMonthsRange, chartMonthOffset]);

  // Gráfico de evolución anual (5 años con soporte de desplazamiento)
  const annualTrend = useMemo(() => {
    const result: Array<{
      key: string;
      label: string;
      sublabel?: string;
      amount: number;
      isCurrent: boolean;
      tooltip: string;
    }> = [];
    const baseYear = Number(selectedYear) + chartYearOffset;
    const yearsCount = 5;

    for (let i = yearsCount - 1; i >= 0; i--) {
      const targetYear = baseYear - i;
      const yStr = String(targetYear);
      const yearPayments = payments.filter((p) => (p.month || '').startsWith(yStr));
      const sum = yearPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      result.push({
        key: yStr,
        label: yStr,
        sublabel: 'Anual',
        amount: sum,
        isCurrent: yStr === selectedYear,
        tooltip: `Año ${yStr}: $${sum.toLocaleString('es-AR')}`,
      });
    }

    const maxAmount = Math.max(...result.map((r) => r.amount), 1);

    return result.map((item) => ({
      ...item,
      heightPercent: Math.max(12, Math.round((item.amount / maxAmount) * 92)),
      isRecord: item.amount === maxAmount && maxAmount > 0,
    }));
  }, [payments, selectedYear, chartYearOffset]);

  const displayedTrend = viewScope === 'ANNUAL' ? annualTrend : monthlyTrend;

  // Clic en barra de gráfico para cambiar el período seleccionado
  const handleBarClick = (key: string) => {
    if (viewScope === 'ANNUAL') {
      const currentM = selectedMonth.split('-')[1] || '01';
      setSelectedMonth(`${key}-${currentM}`);
    } else {
      setSelectedMonth(key);
    }
  };

  // Disparar evento analítico al cargar el reporte
  useEffect(() => {
    if (!loading) {
      trackFinancialReportViewed({
        period: viewScope === 'ANNUAL' ? selectedYear : selectedMonth,
        totalRevenue,
        totalExpenses,
        netBalance,
        paidCount,
        pendingCount: unpaidStudents.length,
      });
    }
  }, [selectedMonth, selectedYear, viewScope, loading, totalRevenue, totalExpenses, netBalance, paidCount, unpaidStudents.length]);

  // =========================================================================
  // ACCIONES DE EXPORTACIÓN
  // =========================================================================
  const handleExportExcel = () => {
    const periodLabel = viewScope === 'ANNUAL' ? selectedYear : selectedMonth;
    setExportFeedback('excel');
    trackReportExported({ format: 'excel', period: periodLabel, totalRevenue });

    // Generar CSV descargable
    const headers = ['Fecha', 'Alumna', 'DNI', 'Concepto', 'Monto', 'Medio de Pago', 'Operacion', 'Notas'];
    const rows = filteredPayments.map((p) => [
      p.paidAt ? p.paidAt.split('T')[0] : '',
      p.student ? `"${p.student.firstName} ${p.student.lastName}"` : 'Alumna',
      p.student?.dni || '',
      `"${p.concept || 'Cuota'}"`,
      p.amount,
      p.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo',
      p.operationNumber || '',
      `"${p.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      viewScope === 'ANNUAL'
        ? `Vulpiare_Reporte_Anual_${selectedYear}.csv`
        : `Vulpiare_Reporte_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExportFeedback(null), 1800);
  };

  const handleExportPdf = () => {
    setExportFeedback('pdf');
    trackReportExported({ format: 'pdf', period: selectedMonth, totalRevenue });
    setTimeout(() => {
      window.print();
      setExportFeedback(null);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header / Banner de sección con Gradiente Primario */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-800 via-purple-700 to-pink-600 p-6 sm:p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl"></div>
        <div className="pointer-events-none absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-pink-400/20 blur-xl"></div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1 text-white text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>MÓDULO FINANCIERO Y ANALÍTICA</span>
          </div>

          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Reportes de Ingresos y Balance
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 font-medium mt-1 leading-relaxed max-w-2xl">
              Seguimiento analítico de recaudación, balances mensuales y comparativas de cobros en tiempo real.
            </p>
          </div>

          {/* Segmented Control Mensual vs Anual */}
          <div className="mt-1 flex rounded-full bg-black/20 p-1 backdrop-blur-sm self-start w-full max-w-[260px]">
            <button
              onClick={() => {
                setViewScope('MONTHLY');
                setChartMonthOffset(0);
              }}
              className={`flex-1 rounded-full py-1.5 text-center text-xs font-black transition-all ${
                viewScope === 'MONTHLY'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-purple-100 hover:text-white'
              }`}
              type="button"
            >
              Mensual
            </button>
            <button
              onClick={() => {
                setViewScope('ANNUAL');
                setChartYearOffset(0);
              }}
              className={`flex-1 rounded-full py-1.5 text-center text-xs font-black transition-all ${
                viewScope === 'ANNUAL'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-purple-100 hover:text-white'
              }`}
              type="button"
            >
              Anual
            </button>
          </div>
        </div>
      </section>

      {/* 2. Selector de Período y Filtro Rápido */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-3xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevPeriod}
              aria-label={viewScope === 'ANNUAL' ? 'Año anterior' : 'Mes anterior'}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {viewScope === 'ANNUAL' ? 'Año Seleccionado' : 'Período Seleccionado'}
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 capitalize">
                  {displayPeriodLabel}
                </span>
              </div>
            </div>
            <button
              onClick={handleNextPeriod}
              aria-label={viewScope === 'ANNUAL' ? 'Año siguiente' : 'Mes siguiente'}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chips de Filtrado Horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'CUOTA', label: 'Cuotas Mensuales' },
            { id: 'MATRICULA', label: 'Matrículas' },
            { id: 'SUELTA', label: 'Clases Sueltas & Pases' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setConceptFilter(chip.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-sm ${
                conceptFilter === chip.id
                  ? 'bg-purple-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'
              }`}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Grid de KPIs Clave (Ingresos, Gastos, Balance Neto, etc.) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Ingresos Totales */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${totalRevenue.toLocaleString('es-AR')}
            </span>
            <div className="mt-1.5 inline-flex items-center gap-1 self-start rounded-full bg-purple-50 px-2 py-0.5 text-purple-700 font-extrabold text-[11px]">
              {revenueVariationPercent >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+{revenueVariationPercent}% vs {viewScope === 'ANNUAL' ? 'año anterior' : 'mes anterior'}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>{revenueVariationPercent}% vs {viewScope === 'ANNUAL' ? 'año anterior' : 'mes anterior'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Gastos Fijos Totales */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">Gastos Fijos</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              ${totalExpenses.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-1">
              {filteredExpenses.length} conceptos del período
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Balance Neto (Ingresos - Gastos) */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">Balance Neto</span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                netBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              ${netBalance.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-1">
              Ingresos - Egresos fijos
            </span>
          </div>
        </div>

        {/* Tarjeta 4: Cobros Hechos & Tasa */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">Cobros Hechos</span>
            <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {paidCount} alumnas
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-pink-600 transition-all duration-500"
                  style={{ width: `${paymentRatePercent}%` }}
                ></div>
              </div>
              <span className="text-xs font-black text-pink-600">{paymentRatePercent}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Secundario de KPIs (Mora y Ticket Promedio) */}
      <section className="grid grid-cols-2 gap-4">
        {/* En Mora / Pendiente */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">En Mora / Pendiente</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
              ${pendingDebtAmount.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-1">
              {unpaidStudents.length} cuotas no saldadas este mes
            </span>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-slate-400">Ticket Promedio</span>
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ${averageTicket.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-1">por alumna activa</span>
          </div>
        </div>
      </section>

      {/* 4. Visualización de Evolución de Ingresos (Mensual o Anual con controles de navegación) */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              {viewScope === 'ANNUAL' ? 'Evolución de Ingresos Anuales' : 'Evolución de Ingresos'}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {viewScope === 'ANNUAL'
                ? 'Histórico de recaudación anual (ARS)'
                : chartMonthOffset > 0
                ? `Período anterior (desplazado ${chartMonthOffset} meses atrás)`
                : `Últimos ${chartMonthsRange === '6M' ? '6' : '12'} meses (ARS)`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {viewScope === 'MONTHLY' ? (
              <>
                {/* Selector 6M vs 12M */}
                <div className="flex items-center rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setChartMonthsRange('6M')}
                    className={`px-3 py-1 text-[11px] font-black rounded-xl transition-all ${
                      chartMonthsRange === '6M'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    6 Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMonthsRange('12M')}
                    className={`px-3 py-1 text-[11px] font-black rounded-xl transition-all ${
                      chartMonthsRange === '12M'
                        ? 'bg-white text-purple-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    12 Meses
                  </button>
                </div>

                {/* Navegación de meses anteriores y siguientes */}
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setChartMonthOffset((prev) => prev + (chartMonthsRange === '6M' ? 6 : 12))}
                    className="p-1.5 rounded-xl hover:bg-white text-slate-700 hover:text-purple-700 transition-colors shadow-sm"
                    title="Ver meses anteriores"
                    aria-label="Ver meses anteriores"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {chartMonthOffset > 0 && (
                    <button
                      type="button"
                      onClick={() => setChartMonthOffset(0)}
                      className="px-2 py-0.5 text-[10px] font-extrabold text-purple-700 hover:bg-white rounded-lg transition-colors"
                      title="Volver a los meses más recientes"
                    >
                      Actual
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={chartMonthOffset <= 0}
                    onClick={() =>
                      setChartMonthOffset((prev) =>
                        Math.max(0, prev - (chartMonthsRange === '6M' ? 6 : 12))
                      )
                    }
                    className={`p-1.5 rounded-xl transition-colors ${
                      chartMonthOffset <= 0
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'hover:bg-white text-slate-700 hover:text-purple-700 shadow-sm'
                    }`}
                    title="Ver meses posteriores"
                    aria-label="Ver meses posteriores"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              /* Navegación de años en vista anual */
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setChartYearOffset((prev) => prev - 5)}
                  className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                  title="Ver 5 años anteriores"
                  aria-label="Ver años anteriores"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Años anteriores</span>
                </button>
                {chartYearOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setChartYearOffset(0)}
                    className="px-2 py-1 text-[10px] font-extrabold text-purple-700 hover:bg-white rounded-lg transition-colors"
                    title="Volver al período actual"
                  >
                    Actual
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setChartYearOffset((prev) => prev + 5)}
                  className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                  title="Ver 5 años siguientes"
                  aria-label="Ver años siguientes"
                >
                  <span>Años siguientes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* UI Chart de Barras con gradiente Vulpiare */}
        <div className="flex h-52 w-full items-end justify-between gap-2 pt-6 pb-2 px-2 overflow-x-auto">
          {displayedTrend.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleBarClick(item.key)}
              title={`${item.tooltip} (Clic para seleccionar período)`}
              className="flex flex-1 min-w-[36px] flex-col items-center gap-1.5 h-full justify-end relative group focus:outline-none transition-transform active:scale-95"
            >
              {item.isRecord && (
                <div className="absolute -top-3.5 rounded-full bg-pink-600 px-2 py-0.5 shadow-sm">
                  <span className="text-[8px] font-black uppercase text-white tracking-wider">RÉCORD</span>
                </div>
              )}
              <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-purple-700 transition-colors">
                {item.amount >= 1000000
                  ? `${(item.amount / 1000000).toFixed(1)}M`
                  : item.amount >= 1000
                  ? `${Math.round(item.amount / 1000)}k`
                  : item.amount}
              </span>
              <div
                className={`w-full max-w-[38px] rounded-t-2xl transition-all duration-500 shadow-sm ${
                  item.isCurrent
                    ? 'bg-gradient-to-t from-purple-700 via-purple-600 to-pink-600 shadow-purple-300 ring-2 ring-purple-600/30'
                    : item.isRecord
                    ? 'bg-gradient-to-t from-pink-600 to-purple-600'
                    : 'bg-slate-200 group-hover:bg-purple-200'
                }`}
                style={{ height: `${item.heightPercent}%` }}
              ></div>
              <div className="flex flex-col items-center mt-1">
                <span
                  className={`text-[10px] font-extrabold leading-none ${
                    item.isCurrent ? 'text-purple-700 font-black' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-[9px] text-slate-400 font-bold mt-0.5 leading-none">
                    {item.sublabel}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Desglose por Medio de Pago */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900">Medios de Pago</h2>
          <span className="text-xs font-bold text-slate-400">Distribución</span>
        </div>

        <div className="space-y-4">
          {/* Transferencia Bancaria */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-slate-800">Transferencia Bancaria</span>
              </div>
              <div className="text-right">
                <span className="font-black text-slate-900">
                  ${paymentMethodStats.transfer.amount.toLocaleString('es-AR')}
                </span>
                <span className="font-extrabold text-purple-700 ml-1.5">
                  ({paymentMethodStats.transfer.percent}%)
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-600 transition-all duration-500"
                style={{ width: `${paymentMethodStats.transfer.percent}%` }}
              ></div>
            </div>
          </div>

          {/* Efectivo en Caja */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-slate-800">Efectivo en Caja</span>
              </div>
              <div className="text-right">
                <span className="font-black text-slate-900">
                  ${paymentMethodStats.cash.amount.toLocaleString('es-AR')}
                </span>
                <span className="font-extrabold text-emerald-700 ml-1.5">
                  ({paymentMethodStats.cash.percent}%)
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${paymentMethodStats.cash.percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Métricas por Categoría / Concepto */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-3">
        <h2 className="text-base sm:text-lg font-black text-slate-900">Ingresos por Concepto</h2>
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {conceptStats.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3.5 sm:px-4 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl ${item.color} text-white flex items-center justify-center font-black shadow-sm`}>
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">{item.name}</span>
                  <span className="text-[11px] text-slate-400 font-medium">{item.subtitle}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 block">
                  ${item.amount.toLocaleString('es-AR')}
                </span>
                <span className={`text-[10px] font-extrabold uppercase ${item.textColor}`}>
                  {item.percent}% del total
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Acciones de Exportación y Descarga */}
      <section className="rounded-3xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Reporte Contable Oficial</h3>
              <p className="text-xs text-slate-600 font-medium">
                Generá el balance para el contador o la administración con un clic.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-purple-900 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-purple-200"
              type="button"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{exportFeedback === 'excel' ? 'Exportando...' : 'Excel (CSV)'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              type="button"
            >
              <Download className="w-4 h-4" />
              <span>{exportFeedback === 'pdf' ? 'Generando...' : 'PDF Oficial'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
