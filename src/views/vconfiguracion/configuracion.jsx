import React, { useState, useEffect } from 'react';
import './configuracion.css';

const VistaConfiguracion = () => {
  const [temaOscuro, setTemaOscuro] = useState(() => {
    return localStorage.getItem('temaOscuro') === 'true';
  });

  // Aplica/remueve la clase dark-mode al body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', temaOscuro);
    localStorage.setItem('temaOscuro', temaOscuro.toString());
  }, [temaOscuro]);

  const toggleTema = () => {
    setTemaOscuro(prev => !prev);
  };

  return (
    <div className="configuracion-container">
      <h2>Configuración</h2>

      <div className="config-section">
        <h3>Preferencias</h3>
        <label>
          <input type="checkbox" checked={temaOscuro} onChange={toggleTema} />
          Activar Modo Oscuro
        </label>
      </div>
    </div>
  );
};

export default VistaConfiguracion;
