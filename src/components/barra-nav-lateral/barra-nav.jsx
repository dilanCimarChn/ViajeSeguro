// BarraNav.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './barra-nav.css';

const BarraNavLateral = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'admin';
  
  // Estado para controlar la visibilidad del sidebar
  const [isVisible, setIsVisible] = useState(true);
  
  const navOptions = {
    admin: [
      { path: '/gestion-usuarios', label: 'Gestión de Administradores' },
      { path: '/gestion-clientes', label: 'Gestión de Clientes' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores' },
      { path: '/viajes-tiempo-real', label: 'Viajes en Tiempo Real' },
      { path: '/grabaciones-camara', label: 'Grabaciones de Cámara' },
      { path: '/reportes', label: 'Reportes' },
      { path: '/configuracion', label: 'Configuración' },
    ],
    receptionist: [
      { path: '/gestion-clientes', label: 'Gestión de Clientes' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores' },
      { path: '/grabaciones-camara', label: 'Grabaciones de Cámara' },
      { path: '/configuracion', label: 'Configuración' },
    ],
  };
  
  const userNavOptions = navOptions[userRole] || [];

  const handleLogout = async () => {
    try {
      localStorage.removeItem('userRole');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para alternar la visibilidad del sidebar
  const toggleSidebar = () => {
    setIsVisible(!isVisible);
    // Guardar preferencia en localStorage
    localStorage.setItem('sidebarVisible', !isVisible);
  };

  // Recuperar preferencia de visibilidad al cargar el componente
  useEffect(() => {
    const savedVisibility = localStorage.getItem('sidebarVisible');
    if (savedVisibility !== null) {
      setIsVisible(savedVisibility === 'true');
    }
  }, []);

  return (
    <div className="barra-nav-lateral">
      <div className={`sidebar ${isVisible ? '' : 'hidden'}`}>
        <div className="logo">
          <img
            src="https://i.ibb.co/xtN8mjLv/logo.png"
            alt="Viaje Seguro"
            className="logo-image"
          />
          <h2>VIAJE SEGURO</h2>
          <p>PANEL DE {userRole === 'admin' ? 'ADMINISTRADOR' : 'RECEPCIONISTA'}</p>
        </div>
        
        <div className="nav-links">
          {userNavOptions.map((option) => (
            <Link 
              key={option.path} 
              to={option.path} 
              className={`nav-button ${location.pathname === option.path ? 'active' : ''}`}
              data-discover="true"
            >
              {option.label}
            </Link>
          ))}
          
          <button className="nav-button logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
      
      <button id="toggle-btn-unique" className="toggle-btn" onClick={toggleSidebar}>
        {isVisible ? '❮' : '❯'}
      </button>
    </div>
  );
};

export default BarraNavLateral;