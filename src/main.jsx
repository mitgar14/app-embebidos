import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

// ---------------------------------------------------------------------------

function showError(err) {
  console.error('[boot]', err)
  const loader = document.getElementById('app-loader')
  if (!loader) return
  let diag = loader.querySelector('.diag')
  if (!diag) {
    diag = document.createElement('pre')
    diag.className = 'diag'
    loader.appendChild(diag)
  }
  diag.textContent += (err.message || err) + '\n'
  const btn = loader.querySelector('.loader-btn')
  if (btn) btn.style.display = 'block'
}

class RootErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    showError(error)
    if (error.stack) showError({ message: '\n' + error.stack })
  }
  render() {
    if (this.state.error) return null
    return this.props.children
  }
}

// ---------------------------------------------------------------------------

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
)
