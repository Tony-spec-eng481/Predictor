import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import Dashboard from './pages/Dashboard'
import DataCollection from './pages/DataCollection'
import History from './pages/History'
import AITrader from './pages/AITrader'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="collect" element={<DataCollection />} />
          <Route path="history" element={<History />} />
          <Route path="ai-trader" element={<AITrader />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}