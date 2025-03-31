import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import Reportes from '../../components/reportes/reportes';
import './reportes.css';

const VistaReportes = () => {
  return (
    <div className="vista-reportes">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="reportes-container">
        <Reportes />
      </div>
    </div>
  );
};

export default VistaReportes;
