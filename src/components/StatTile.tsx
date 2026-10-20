type Props = {
  label: string
  value: string
  detail?: string
  // colour of the matching chart series, shown as a key dot beside the label
  keyColor?: string
}

export default function StatTile({ label, value, detail, keyColor }: Props) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
      <p className="flex items-center gap-1.5 text-sm text-slate-500">
        {keyColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: keyColor }} />}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}
