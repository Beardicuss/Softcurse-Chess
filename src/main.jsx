import React from 'react'
import ReactDOM from 'react-dom/client'
import BattleChess3D from './BattleChess3D.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'));
const App = (
  <ErrorBoundary>
    <BattleChess3D />
  </ErrorBoundary>
);

// PERFORMANCE FIX #2: Only use StrictMode in development to avoid double-mount overhead in production
if (import.meta.env.MODE === 'development') {
  root.render(
    <React.StrictMode>
      {App}
    </React.StrictMode>
  );
} else {
  root.render(App);
}
