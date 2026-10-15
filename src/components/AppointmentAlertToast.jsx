import React from 'react';
import { Clock, ArrowRight, X, Calendar, User, Bell } from 'lucide-react';

const AppointmentAlertToast = ({
  alert,
  onOpenRecord,
  onOpenAgenda,
  onDismiss,
}) => {
  if (!alert) return null;

  const { patientId, patientName, hora, minutesLeft, tipo } = alert;

  const timeText =
    minutesLeft <= 0
      ? 'Iniciando agora!'
      : minutesLeft === 1
      ? 'Em 1 minuto!'
      : `Em ${minutesLeft} minutos!`;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-[420px] animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-400 p-4 relative overflow-hidden backdrop-blur-md">
        {/* Barra superior de destaque colorido */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-pulse" />

        <div className="flex items-start gap-3.5">
          {/* Ícone Pulsante */}
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 relative">
            <Clock size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white animate-ping" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <Bell size={10} className="text-amber-700" />
                Consulta Próxima • {timeText}
              </span>

              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
                title="Dispensar aviso"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-1.5 truncate">
              {patientName}
            </h3>

            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Horário: <strong className="text-slate-800 font-semibold">{hora}</strong></span>
              {tipo && (
                <>
                  <span>•</span>
                  <span className="truncate">{tipo}</span>
                </>
              )}
            </p>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onOpenRecord(patientId);
                  onDismiss();
                }}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User size={14} />
                <span>Abrir Prontuário</span>
              </button>

              <button
                onClick={() => {
                  onOpenAgenda();
                  onDismiss();
                }}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Calendar size={14} />
                <span>Ver Agenda</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentAlertToast;
