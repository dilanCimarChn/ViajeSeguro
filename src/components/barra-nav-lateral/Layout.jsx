// DashboardLayout.js
import React from 'react';
import BarraNavLateral from './barra-nav'; // Ajusta la ruta según tu estructura
import './Layout.css';

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <BarraNavLateral />
      <div className="content">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;