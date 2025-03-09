import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import ViajesTiempoReal from '../../components/viajes-tiempo-real/viajes-tiempo-real';
import './viajes-tiempo-real.css';

const VistaViajesTiempoReal = () => {
  return (
    <div className="vista-viajes-tiempo-real">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="viajes-tiempo-real-container">
        <ViajesTiempoReal />
      </div>
    </div>
  );
};

export default VistaViajesTiempoReal;
