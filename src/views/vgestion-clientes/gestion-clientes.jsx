import React from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import GestionClientes from '../../components/gestion-clientes/gestion-clientes';
import './gestion-clientes.css';

const VistaGestionClientes = () => {
  return (
    <div className="vista-gestion-clientes">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="gestion-clientes-container">
        <GestionClientes />
      </div>
    </div>
  );
};

export default VistaGestionClientes;
