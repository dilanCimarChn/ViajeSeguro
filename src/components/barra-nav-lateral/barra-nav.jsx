// components/barra-nav-lateral/barra-nav.jsx - VERSIÓN ACTUALIZADA
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import './barra-nav.css';

const BarraNavLateral = ({ handleLogout: appHandleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const auth = getAuth();

  // Cargar userRole desde localStorage solo una vez
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    const savedVisibility = localStorage.getItem('sidebarVisible');
    if (savedVisibility !== null) {
      setIsVisible(savedVisibility === 'true');
    }
  }, []);

  // Efecto para aplicar clases al body cuando cambia la visibilidad
  useEffect(() => {
    const body = document.body;
    if (isVisible) {
      body.classList.add('sidebar-visible');
      body.classList.remove('sidebar-hidden');
    } else {
      body.classList.add('sidebar-hidden');
      body.classList.remove('sidebar-visible');
    }

    // Cleanup function para remover las clases cuando el componente se desmonte
    return () => {
      body.classList.remove('sidebar-visible', 'sidebar-hidden');
    };
  }, [isVisible]);

  // 🆕 OPCIONES DE NAVEGACIÓN ACTUALIZADAS CON PERFIL
  const navOptions = {
    admin: [
      { path: '/gestion-usuarios', label: 'Gestión de Administradores', icon: 'fa-users-cog' },
      { path: '/gestion-clientes', label: 'Gestión de Clientes', icon: 'fa-users' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores', icon: 'fa-car' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores', icon: 'fa-clipboard-list' },
      { path: '/viajes-tiempo-real', label: 'Viajes en Tiempo Real', icon: 'fa-route' },
      { path: '/grabaciones-camara', label: 'Grabaciones de Cámara', icon: 'fa-video' },
      { path: '/reportes', label: 'Reportes', icon: 'fa-chart-bar' },
      { path: '/configuracion', label: 'Configuración', icon: 'fa-cog' },
      { path: '/mi-perfil', label: 'Mi Perfil', icon: 'fa-user-circle' }, // 🆕 NUEVO
    ],
    receptionist: [
      { path: '/gestion-clientes', label: 'Gestión de Clientes', icon: 'fa-users' },
      { path: '/gestion-conductores', label: 'Gestión de Conductores', icon: 'fa-car' },
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores', icon: 'fa-clipboard-list' },
      { path: '/grabaciones-camara', label: 'Grabaciones de Cámara', icon: 'fa-video' },
      { path: '/configuracion', label: 'Configuración', icon: 'fa-cog' },
      { path: '/mi-perfil', label: 'Mi Perfil', icon: 'fa-user-circle' }, // 🆕 NUEVO
    ],
  };

  const userNavOptions = navOptions[userRole] || [];

  // Utilizar el método de logout proporcionado por App si está disponible,
  // de lo contrario, implementar una versión segura aquí
  const handleLogout = async () => {
    try {
      if (appHandleLogout) {
        // Usar el manejador de logout proporcionado por App.jsx
        appHandleLogout();
      } else {
        console.log("Iniciando proceso de logout desde barra lateral");
       
        // Limpiar datos de usuario
        localStorage.removeItem('userRole');
       
        // Cerrar sesión de Firebase
        await signOut(auth);
       
        // Redirigir a login con redirección dura
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert("Error al cerrar sesión. Intenta recargar la página.");
    }
  };

  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('sidebarVisible', newVisibility);
  };

  if (!userRole) return null; // Evita render si el rol aún no está cargado

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
          {/* 🆕 NAVEGACIÓN CON ICONOS */}
          {userNavOptions.map((option) => (
            <Link
              key={option.path}
              to={option.path}
              className={`nav-button ${location.pathname === option.path ? 'active' : ''}`}
              data-discover="true"
            >
              {option.icon && <i className={`fas ${option.icon}`}></i>}
              <span>{option.label}</span>
            </Link>
          ))}
          
          {/* 🆕 SEPARADOR VISUAL */}
          <div className="nav-separator"></div>
          
          {/* 🆕 BOTÓN DE LOGOUT CON ICONO */}
          <button className="nav-button logout-button" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Cerrar sesión</span>
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