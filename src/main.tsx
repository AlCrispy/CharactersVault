import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './systems';
import './fonts';
import './styles.css';
import './theme-heraldic.css';
import './theme-abjurer.css';
import { applyTheme, getStoredTheme } from './ui/theme';

// Prima del render, per non mostrare il tema sbagliato nemmeno per un istante.
applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
