interface SummaryBarProps {
  total: number
  changed: number
  selected: number
}

export function SummaryBar({ total, changed, selected }: SummaryBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
        {changed} cambiaron de precio
      </span>
      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
        {total} productos en total
      </span>
      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
        {selected} seleccionados para imprimir
      </span>
    </div>
  )
}
