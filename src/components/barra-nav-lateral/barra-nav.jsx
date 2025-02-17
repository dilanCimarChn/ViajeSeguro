import React from 'react';
import { Link } from 'react-router-dom';
import './barra-nav.css';

const BarraNavLateral = () => {
  const userRole = localStorage.getItem('userRole') || 'guest';

  const navOptions = {
    admin: [{ path: '/gestion-usuarios', label: 'Gestión de Usuarios' }],
    receptionist: [],
  };

  const userNavOptions = navOptions[userRole] || [];

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/helios.svg" alt="Helios Logo" className="logo-image" />
        <h2>VIAJE SEGURO</h2>
        <p>PANEL DE {userRole === 'admin' ? 'ADMINISTRADOR' : 'RECEPCIONISTA'}</p>
      </div>
      <div className="user-info">
        <img src="/profile.svg" alt="User Profile" className="user-avatar" />
        <h3>Usuario</h3>
        <p>{userRole === 'admin' ? 'Administrador' : 'Recepcionista'}</p>
      </div>
      <nav className="nav-links">
        {userNavOptions.map((option) => (
          <Link key={option.path} to={option.path} className="nav-button">
            {option.label}
          </Link>
        ))}
      </nav>
      <button className="nav-button" onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
};

/**
 * Cierra la sesión y redirige a la página de login.
 */
const handleLogout = () => {
  localStorage.removeItem('userRole');
  window.location.href = '/login';
};

export default BarraNavLateral;
