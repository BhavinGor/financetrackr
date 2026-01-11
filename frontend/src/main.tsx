/**
 * FinanceTrackr Frontend Entry Point
 * 
 * Initializes the React application and mounts it to the DOM.
 * This is the first file that runs when the application starts.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
