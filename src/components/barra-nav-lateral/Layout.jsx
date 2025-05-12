import React from 'react';
import BarraNavLateral from './barra-nav';
import './layout.css';

// Componente Layout que incluye la barra lateral y el contenido
const DashboardLayout = ({ children, handleLogout }) => {
  return (
    <div className="dashboard-layout">
      <BarraNavLateral handleLogout={handleLogout} />
      <div className="content-area">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;