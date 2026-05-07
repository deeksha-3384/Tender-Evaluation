import { NavLink } from 'react-router-dom'
import { FileText, LayoutDashboard } from 'lucide-react'

const linkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-out'

export function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      linkBase,
      'hover:bg-[#111111] hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]',
      isActive
        ? 'border border-[#222222] bg-[#0f0f0f] text-white shadow-[0_0_0_rgba(0,0,0,0)]'
        : 'text-slate-300',
    ].join(' ')

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#222222] bg-[#0a0a0a] md:block">
      <div className="sticky top-0 p-5">
        <div className="flex items-center gap-2 rounded-2xl border border-[#222222] bg-[#111111] px-3 py-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6] text-white shadow-[0_0_30px_rgba(59,130,246,0.35)]">
            <FileText className="h-4 w-4" aria-hidden />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">TenderAI</div>
            <div className="text-xs text-slate-400">AI tender evaluation</div>
          </div>
        </div>

        <nav className="mt-5 grid gap-2">
          <NavLink to="/dashboard" className={linkClass} end>
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </NavLink>
          <NavLink to="/evaluate" className={linkClass}>
            <FileText className="h-4 w-4" aria-hidden />
            Evaluate
          </NavLink>
        </nav>

        <div className="mt-6 rounded-xl border border-[#222222] bg-[#111111] p-4">
          <div className="text-xs text-slate-400">Tip</div>
          <div className="mt-1 text-sm text-slate-200">
            Upload a tender, then evaluate bidder PDFs against extracted eligibility
            criteria.
          </div>
        </div>
      </div>
    </aside>
  )
}

