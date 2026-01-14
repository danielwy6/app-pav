
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { db } from './db.ts';

const RootComponent: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    db.init()
      .then(() => setDbReady(true))
      .catch(err => {
        console.error("Falha ao inicializar o banco de dados:", err);
        setDbReady(true); // Tenta prosseguir mesmo assim
      });
  }, []);

  if (!dbReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Iniciando PavInspect...</p>
      </div>
    );
  }

  return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
