import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import SecureApp from './SecureApp';
import './styles.css';
import { PreferencesProvider } from './Preferences';
import { LegacyLocaleBridge } from './LocaleRuntime';

// PlayGo uses Supabase Auth for both student and administrator routes.
// Do not silently fall back to the legacy browser-only demo app:
// that app does not contain /admin and may redirect unknown routes.
ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode><PreferencesProvider><LegacyLocaleBridge /><BrowserRouter><SecureApp /></BrowserRouter></PreferencesProvider></React.StrictMode>
);
