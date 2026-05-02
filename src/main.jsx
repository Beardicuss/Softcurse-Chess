import React from 'react'
import ReactDOM from 'react-dom/client'
import BattleChess3D from './BattleChess3D.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BattleChess3D />
    </ErrorBoundary>
  </React.StrictMode>
)