import * as React from 'react'

import { Sidebar } from './Sidebar'

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-[#0a0a0a] text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}

