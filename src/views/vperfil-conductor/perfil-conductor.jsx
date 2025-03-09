import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import PerfilConductor from '../../components/perfil-conductor/perfil-conductor';
import './perfil-conductor.css';

const VistaPerfilConductor = () => {
  return (
    <div className="vista-perfil-conductor">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="perfil-conductor-container">
        <PerfilConductor />
      </div>
    </div>
  );
};

export default VistaPerfilConductor;
