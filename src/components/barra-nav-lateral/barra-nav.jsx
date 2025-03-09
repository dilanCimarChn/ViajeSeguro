import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import './barra-nav.css';

const BarraNavLateral = () => {
  const userRole = localStorage.getItem('userRole') || 'guest';
  const navigate = useNavigate();
  const auth = getAuth();

  const navOptions = {
    admin: [
      { path: '/gestion-usuarios', label: 'Gestión de Usuarios' },
      { path: '/gestion-clientes', label: 'Gestión de Clientes' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores' },
      { path: '/perfil-cliente', label: 'Perfil Cliente' },
      { path: '/perfil-conductor', label: 'Perfil Conductor' },
      { path: '/viajes-tiempo-real', label: 'Viajes en Tiempo Real' },
      { path: '/reportes', label: 'Reportes' },
      { path: '/configuracion', label: 'Configuración' },
    ],
    receptionist: [
      { path: '/gestion-clientes', label: 'Gestión de Clientes' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores' },
      { path: '/configuracion', label: 'Configuración' },
    ],
  };

  const userNavOptions = navOptions[userRole] || [];

  /**
   * Cierra la sesión en Firebase, limpia el localStorage y redirige a la página de inicio de sesión.
   */
  const handleLogout = async () => {
    try {
      await signOut(auth); // Cerrar sesión en Firebase
      localStorage.removeItem('userRole'); // Limpiar localStorage
      navigate('/login'); // Redirigir al login
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/Viajeseguro.svg" alt="Viaje Seguro" className="logo-image" />
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

export default BarraNavLateral;
