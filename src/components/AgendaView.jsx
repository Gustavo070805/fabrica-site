import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Stethoscope,
  Phone,
  Trash2,
  CheckCircle2,
  Play,
  FileText,
  User,
  AlertCircle
} from 'lucide-react';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const CONSULTATION_TYPES = [
  'Consulta Inicial / Avaliação',
  'Retorno Clínico',
  'Sessão de Terapia',
  'Acompanhamento Periódico',
  'Procedimento Clínico',
];

const STATUS_CONFIG = {
  agendado: {
    label: 'Agendado',
    pillClass: 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200',
    dotClass: 'bg-slate-400',
  },
  confirmado: {
    label: 'Confirmado',
    pillClass: 'bg-cyan-50 text-cyan-800 border border-cyan-200/80 hover:bg-cyan-100',
    dotClass: 'bg-cyan-500',
  },
  em_atendimento: {
    label: 'Em Atendimento',
    pillClass: 'bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100',
    dotClass: 'bg-purple-500 animate-pulse',
  },
  concluido: {
    label: 'Concluído',
    pillClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500',
  },
  cancelado: {
    label: 'Cancelado',
    pillClass: 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100',
    dotClass: 'bg-rose-500',
  },
};

const pad2 = (n) => String(n).padStart(2, '0');

const formatIso = (year, month, day) => {
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const getTodayIso = () => {
  const d = new Date();
  return formatIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

const AgendaView = ({
  patients = [],
  onOpenRecord,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
}) => {
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApptDetails, setSelectedApptDetails] = useState(null);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    patientId: '',
    data: getTodayIso(),
    hora: '09:00',
    tipo: 'Consulta Inicial / Avaliação',
    status: 'agendado',
    observacoes: '',
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });

  // Coletar e normalizar todos os agendamentos cadastrados
  const allAppointments = patients.flatMap((p) =>
    (p.consultas || []).map((c) => ({
      ...c,
      patientId: p.id,
      patientName: p.nome,
      patientPhone: p.telefone,
      patientCpf: p.cpf,
      patientDiagnosis: p.diagnostico,
    }))
  );

  // Navegação de Período
  const handlePrevPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Abrir modal com data pré-selecionada
  const handleOpenNewModal = (targetDate = null) => {
    const today = getTodayIso();
    let dateStr = targetDate || formatIso(year, month + 1, currentDate.getDate());
    // Se a data selecionada for anterior a hoje, ajusta para hoje
    if (dateStr < today) {
      dateStr = today;
    }
    setFormError('');
    setFormData({
      patientId: patients[0]?.id || '',
      data: dateStr,
      hora: '09:00',
      tipo: 'Consulta Inicial / Avaliação',
      status: 'agendado',
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitAppointment = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.patientId) {
      setFormError('Selecione um paciente para a consulta.');
      return;
    }

    const todayIso = getTodayIso();
    if (formData.data < todayIso) {
      setFormError('Não é permitido agendar consultas para datas retroativas.');
      return;
    }

    // Regra: Não pode ter duas consultas ativas no mesmo dia e horário
    const conflict = allAppointments.find(
      (c) =>
        c.data === formData.data &&
        c.hora === formData.hora &&
        c.status !== 'cancelado'
    );

    if (conflict) {
      setFormError(
        `Horário indisponível! Já existe uma consulta agendada para às ${formData.hora} neste dia (${conflict.patientName || 'Outro paciente'}). Escolha outro horário.`
      );
      return;
    }

    onAddAppointment(formData.patientId, {
      id: Date.now(),
      data: formData.data,
      hora: formData.hora,
      tipo: formData.tipo,
      status: formData.status,
      observacoes: formData.observacoes,
    });

    setIsModalOpen(false);
  };

  // -------------------------------------------------------------
  // CÁLCULO DA GRADE MENSAL (7 colunas Seg-Dom)
  // -------------------------------------------------------------
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  // Ajuste para Segunda-feira ser o dia 0
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

  const monthGridDays = [];

  // Dias do mês anterior
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = lastDayOfPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    const iso = formatIso(prevDate.getFullYear(), prevDate.getMonth() + 1, d);
    monthGridDays.push({
      dayNumber: d,
      dateIso: iso,
      isCurrentMonth: false,
      isToday: iso === getTodayIso(),
      appointments: allAppointments.filter((c) => c.data === iso),
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = formatIso(year, month + 1, d);
    monthGridDays.push({
      dayNumber: d,
      dateIso: iso,
      isCurrentMonth: true,
      isToday: iso === getTodayIso(),
      appointments: allAppointments.filter((c) => c.data === iso),
    });
  }

  // Dias do próximo mês para fechar a grade (múltiplo de 7)
  const remainingCells = 35 - monthGridDays.length > 0 ? 35 - monthGridDays.length : (42 - monthGridDays.length);
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    const iso = formatIso(nextDate.getFullYear(), nextDate.getMonth() + 1, d);
    monthGridDays.push({
      dayNumber: d,
      dateIso: iso,
      isCurrentMonth: false,
      isToday: iso === getTodayIso(),
      appointments: allAppointments.filter((c) => c.data === iso),
    });
  }

  // -------------------------------------------------------------
  // CÁLCULO DA SEMANA ATUAL (Segunda a Domingo)
  // -------------------------------------------------------------
  const weekDays = [];
  const currDayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - currDayIndex);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = formatIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
    weekDays.push({
      dayName: WEEKDAYS[i],
      dayNumber: d.getDate(),
      dateIso: iso,
      isToday: iso === getTodayIso(),
      appointments: allAppointments
        .filter((c) => c.data === iso)
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
    });
  }

  // -------------------------------------------------------------
  // CÁLCULO DO DIA ATUAL
  // -------------------------------------------------------------
  const currentIso = formatIso(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
  const dayAppointments = allAppointments
    .filter((c) => c.data === currentIso)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 overflow-hidden">
      {/* Cabeçalho Principal da Tela (Padrão ViguMed) */}
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Agenda & Consultas
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestão de agendamentos, grade de horários e fluxo de recepção dos pacientes
        </p>
      </div>

      {/* Topo do Calendário no Estilo da Foto (Versão Clara / ViguMed) */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Título do Mês e Ano Estilizado */}
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize">
              {viewMode === 'day'
                ? currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
                : monthName}
            </h2>
            <span className="text-2xl sm:text-3xl font-black text-slate-200 tracking-tighter select-none">
              {year}
            </span>
          </div>

          {/* Controles de Período, Seletor Mês/Semana/Dia e Botão Novo */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Navegador Anterior/Hoje/Próximo */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={handlePrevPeriod}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
                title="Período anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-semibold hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition"
              >
                Hoje
              </button>
              <button
                onClick={handleNextPeriod}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
                title="Próximo período"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Alternador de Modo: Mês | Semana | Dia */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === 'month'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === 'week'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === 'day'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dia
              </button>
            </div>

            {/* Botão de Agendamento (exibido apenas no Mês e Semana; no Dia já há o botão próprio) */}
            {viewMode !== 'day' && (
              <button
                onClick={() => handleOpenNewModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>Agendar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISÃO MÊS (GRADE INSPIRADA NA FOTO, EM TEMA CLARO) */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="shrink-0 grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/60 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">
            {WEEKDAYS.map((w, idx) => (
              <div key={idx} className="truncate px-1">
                {w}
              </div>
            ))}
          </div>

          {/* Grade de Dias do Mês */}
          <div
            className={`flex-1 min-h-0 grid grid-cols-7 ${
              monthGridDays.length > 35 ? 'grid-rows-6' : 'grid-rows-5'
            } divide-x divide-y divide-slate-200/80 overflow-hidden`}
          >
            {monthGridDays.map((cell, idx) => {
              const appts = cell.appointments;
              const isPast = cell.dateIso < getTodayIso();

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isPast) return;
                    handleOpenNewModal(cell.dateIso);
                  }}
                  className={`h-full min-h-0 p-1 sm:p-1.5 flex flex-col justify-between transition overflow-hidden ${
                    isPast
                      ? 'bg-slate-50/40 cursor-default opacity-75'
                      : 'cursor-pointer group ' +
                        (!cell.isCurrentMonth
                          ? 'bg-slate-50/40 hover:bg-slate-50'
                          : cell.isToday
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'bg-white hover:bg-slate-50/70')
                  }`}
                >
                  {/* Topo da Célula com o Número do Dia */}
                  <div className="shrink-0 flex items-center justify-end leading-none">
                    {cell.isToday ? (
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-2xs">
                        {cell.dayNumber}
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] sm:text-xs font-bold ${
                          cell.isCurrentMonth ? (isPast ? 'text-slate-400' : 'text-slate-800') : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    )}
                  </div>

                  {/* Lista de Pílulas de Consulta (Event Pills como na foto) */}
                  <div className="space-y-0.5 my-0.5 flex-1 min-h-0 overflow-hidden">
                    {appts.slice(0, 2).map((appt) => {
                      const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.agendado;

                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApptDetails(appt);
                          }}
                          className={`rounded-md px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold truncate flex items-center gap-1 shadow-2xs transition cursor-pointer ${cfg.pillClass}`}
                          title={`${appt.hora || ''} - ${appt.patientName} (${cfg.label})`}
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.dotClass}`} />
                          <span className="font-bold shrink-0">{appt.hora || '--:--'}</span>
                          <span className="truncate">{appt.patientName}</span>
                        </div>
                      );
                    })}

                    {appts.length > 2 && (
                      <span className="block text-[8px] sm:text-[9px] font-bold text-slate-500 pl-0.5 leading-none">
                        +{appts.length - 2} mais
                      </span>
                    )}
                  </div>

                  {!isPast ? (
                    <div className="shrink-0 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition text-right leading-none">
                      + novo
                    </div>
                  ) : (
                    <div className="shrink-0 h-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VISÃO SEMANA (7 COLUNAS VERTICAIS) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-slate-200/80 overflow-hidden">
            {weekDays.map((col, idx) => (
              <div key={idx} className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
                {/* Cabeçalho do Dia da Semana */}
                <div
                  className={`shrink-0 p-2 text-center border-b border-slate-200/80 ${
                    col.isToday ? 'bg-slate-900 text-white' : 'bg-slate-50/60'
                  }`}
                >
                  <p
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      col.isToday ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {col.dayName}
                  </p>
                  <p
                    className={`text-sm font-black ${
                      col.isToday ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {col.dayNumber}
                  </p>
                </div>

                {/* Lista de Consultas do Dia */}
                <div className="p-1.5 sm:p-2 space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                  {col.appointments.length === 0 ? (
                    <div className="py-8 text-center text-slate-300 text-xs">
                      Sem consultas
                    </div>
                  ) : (
                    col.appointments.map((appt) => {
                      const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.agendado;

                      return (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedApptDetails(appt)}
                          className={`p-1.5 sm:p-2 rounded-xl text-xs space-y-0.5 cursor-pointer transition shadow-2xs ${cfg.pillClass}`}
                        >
                          <div className="flex items-center justify-between font-bold text-[10px]">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {appt.hora}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          </div>
                          <p className="font-bold truncate text-slate-900 text-[11px]">{appt.patientName}</p>
                          <p className="text-[9px] opacity-80 truncate">{appt.tipo}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Botão de Adicionar nesta Data */}
                <div className="shrink-0 p-1.5 border-t border-slate-100">
                  {col.dateIso < getTodayIso() ? (
                    <div className="w-full py-1 text-[9px] font-medium text-slate-300 text-center select-none">
                      Data passada
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenNewModal(col.dateIso)}
                      className="w-full py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition text-center"
                    >
                      + Agendar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISÃO DIA (LISTA DETALHADA COM AÇÕES E STATUS) */}
      {/* ========================================================================= */}
      {viewMode === 'day' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Atendimentos de {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {dayAppointments.length} consulta(s) marcadas para este dia
              </p>
            </div>

            {currentIso < getTodayIso() ? (
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                Data Retroativa
              </span>
            ) : (
              <button
                onClick={() => handleOpenNewModal(currentIso)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Plus size={13} /> Novo Horário
              </button>
            )}
          </div>

          {dayAppointments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
              <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Nenhum atendimento neste dia</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique no botão acima para agendar uma consulta para esta data.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-1 space-y-2.5">
              {dayAppointments.map((appt) => {
                const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.agendado;
                const initials = (appt.patientName || 'P')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center bg-slate-900 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 shrink-0 shadow-2xs min-w-[60px]">
                        <Clock size={11} className="text-emerald-400 mb-0.5" />
                        <span>{appt.hora}</span>
                      </div>

                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                        {initials}
                      </div>

                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {appt.patientName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {appt.tipo} {appt.patientPhone ? `• ${appt.patientPhone}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <select
                        value={appt.status}
                        onChange={(e) =>
                          onUpdateAppointmentStatus(appt.patientId, appt.id, e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-none transition ${cfg.pillClass}`}
                      >
                        <option value="agendado">🕒 Agendado</option>
                        <option value="confirmado">✓ Confirmado</option>
                        <option value="em_atendimento">▶ Em Atendimento</option>
                        <option value="concluido">✓ Concluído</option>
                        <option value="cancelado">✕ Cancelado</option>
                      </select>

                      <button
                        onClick={() => {
                          if (appt.status === 'agendado' || appt.status === 'confirmado') {
                            onUpdateAppointmentStatus(appt.patientId, appt.id, 'em_atendimento');
                          }
                          onOpenRecord(appt.patientId);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition"
                      >
                        <Stethoscope size={13} className="text-emerald-400" />
                        <span>Prontuário</span>
                      </button>

                      <button
                        onClick={() => onDeleteAppointment(appt.patientId, appt.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Excluir agendamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES AO CLICAR NA PÍLULA (EVENT CLICK MODAL) */}
      {/* ========================================================================= */}
      {selectedApptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <CalendarIcon size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Detalhes da Consulta</h3>
                  <p className="text-[11px] text-slate-500">{selectedApptDetails.data} às {selectedApptDetails.hora}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApptDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Paciente
                  </span>
                  <span className="text-xs text-slate-500">
                    CPF: {selectedApptDetails.patientCpf || '-'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedApptDetails.patientName}
                </h4>
                {selectedApptDetails.patientPhone && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-emerald-600" />
                    {selectedApptDetails.patientPhone}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo
                  </span>
                  <span className="font-semibold text-slate-800">{selectedApptDetails.tipo}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Status Atual
                  </span>
                  <select
                    value={selectedApptDetails.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      onUpdateAppointmentStatus(
                        selectedApptDetails.patientId,
                        selectedApptDetails.id,
                        newStatus
                      );
                      setSelectedApptDetails({ ...selectedApptDetails, status: newStatus });
                    }}
                    className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="agendado">🕒 Agendado</option>
                    <option value="confirmado">✓ Confirmado</option>
                    <option value="em_atendimento">▶ Em Atendimento</option>
                    <option value="concluido">✓ Concluído</option>
                    <option value="cancelado">✕ Cancelado</option>
                  </select>
                </div>
              </div>

              {selectedApptDetails.observacoes && (
                <div className="text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Observações
                  </span>
                  <p className="text-slate-700 italic">{selectedApptDetails.observacoes}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAppointment(selectedApptDetails.patientId, selectedApptDetails.id);
                    setSelectedApptDetails(null);
                  }}
                  className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Desmarcar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      selectedApptDetails.status === 'agendado' ||
                      selectedApptDetails.status === 'confirmado'
                    ) {
                      onUpdateAppointmentStatus(
                        selectedApptDetails.patientId,
                        selectedApptDetails.id,
                        'em_atendimento'
                      );
                    }
                    onOpenRecord(selectedApptDetails.patientId);
                    setSelectedApptDetails(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Stethoscope size={13} className="text-emerald-400" />
                  <span>Abrir Prontuário</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE NOVO AGENDAMENTO */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <CalendarIcon size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Agendar Consulta</h3>
                  <p className="text-[11px] text-slate-500">Marque um novo horário para atendimento</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAppointment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Selecione o Paciente *
                </label>
                {patients.length === 0 ? (
                  <p className="text-xs text-rose-600">Nenhum paciente cadastrado ainda.</p>
                ) : (
                  <select
                    value={formData.patientId}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, patientId: e.target.value });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    required
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} {p.cpf ? `(${p.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    min={getTodayIso()}
                    value={formData.data}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, data: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, hora: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Consulta
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                >
                  {CONSULTATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações / Queixa Prévia
                </label>
                <input
                  type="text"
                  placeholder="Ex: Primeira consulta, dores musculares..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Confirmar Agendamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaView;
