import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import SolicitudesConductores from '../../components/solicitudes-conductores/solicitudes-conductores';
import './solicitudes-conductores.css';

const VistaSolicitudesConductores = () => {
  return (
    <div className="vista-solicitudes-conductores">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="solicitudes-conductores-container">
        <SolicitudesConductores />
      </div>
    </div>
  );
};

export default VistaSolicitudesConductores;
