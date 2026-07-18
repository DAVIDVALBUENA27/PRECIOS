interface SummaryBarProps {
  total: number
  changed: number
  selected: number
}

export function SummaryBar({ total, changed, selected }: SummaryBarProps) {
  const stats = [
    {
      label: 'Total de productos',
      value: total.toLocaleString('es-CO'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      iconBg: 'bg-slate-100 text-slate-400',
    },
    {
      label: 'Cambiaron de precio',
      value: changed.toLocaleString('es-CO'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100 text-amber-500',
    },
    {
      label: 'Para imprimir',
      value: selected.toLocaleString('es-CO'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
        </svg>
      ),
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100 text-blue-500',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`flex items-center gap-3 rounded-xl border border-slate-200/60 ${s.bg} px-4 py-3`}>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}>
            {s.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
