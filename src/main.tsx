import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import SecureApp from './SecureApp';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter>{import.meta.env.VITE_PLAYGO_AUTH_MODE === 'supabase' ? <SecureApp /> : <App />}</BrowserRouter></React.StrictMode>);
