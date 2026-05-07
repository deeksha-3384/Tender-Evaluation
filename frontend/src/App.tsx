import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import PageShell from './components/layout/PageShell'
import Dashboard from './pages/Dashboard'
import Evaluate from './pages/Evaluate'
import Landing from './pages/Landing'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <PageShell>
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/evaluate" element={<Evaluate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageShell>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return <AnimatedRoutes />
}

