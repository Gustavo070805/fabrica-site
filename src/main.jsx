import React from 'react';
import ReactDOM from 'react-dom/client';
import MedicalRecordApp from './medical-record-app.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MedicalRecordApp />
    </ErrorBoundary>
  </React.StrictMode>
);
