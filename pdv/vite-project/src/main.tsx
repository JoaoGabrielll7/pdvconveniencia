import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DbCheckPage from './DbCheckPage.tsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isDbCheck = path === '/db-check' || path === '/verificar-conexao'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDbCheck ? <DbCheckPage /> : <App />}
  </StrictMode>,
)
