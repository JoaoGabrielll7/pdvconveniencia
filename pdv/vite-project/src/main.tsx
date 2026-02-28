import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DbCheckPage from './DbCheckPage.tsx'
import VerificarErroPage from './VerificarErroPage.tsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isDbCheck = path === '/db-check' || path === '/verificar-conexao'
const isVerificarErro = path === '/verificar-erro'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isVerificarErro ? <VerificarErroPage /> : isDbCheck ? <DbCheckPage /> : <App />}
  </StrictMode>,
)
