import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraNavLateral from './barra-nav';
import './Layout.css';

const Layout = ({ isOpen, toggleSidebar, windowWidth }) => {
  return (
    <div className="app-container">
      {/* Botón para mostrar/ocultar la barra lateral en móviles */}
      {windowWidth < 768 && (
        <button
          className={`sidebar-toggle ${isOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          aria-label="Alternar menú"
        >
          <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      )}
     
      {/* Overlay para cerrar el sidebar al hacer clic fuera en móviles */}
      {isOpen && windowWidth < 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
     
      <BarraNavLateral
        isOpen={isOpen}
        toggleSidebar={toggleSidebar}
        windowWidth={windowWidth}
      />
      <main className={`main-content ${isOpen ? 'with-sidebar' : 'without-sidebar'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;