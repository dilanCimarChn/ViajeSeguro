// src/views/vconfiguracion/configuracion.jsx
import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import Configuracion from '../../components/configuracion/configuracion';
import './configuracion.css';

const VistaConfiguracion = () => {
  return (
    <div className="vista-configuracion">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="configuracion-container">
        <Configuracion />
      </div>
    </div>
  );
};

export default VistaConfiguracion;