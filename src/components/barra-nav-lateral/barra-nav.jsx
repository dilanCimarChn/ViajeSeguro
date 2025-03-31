import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import './barra-nav.css';  

// ID único para la barra de navegación
const SIDEBAR_ID = 'app-sidebar-' + Math.random().toString(36).substr(2, 9);

const BarraNavLateral = () => {  
  const userRole = localStorage.getItem('userRole') || 'guest';  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();  
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);
  
  // Estado para controlar si la barra está visible o no
  // Inicializar desde localStorage para mantener el estado entre recargas
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    return savedState !== null ? savedState === 'true' : true;
  });
  
  // Verificar si ya existe un sidebar en el DOM al montar
  useEffect(() => {
    const existingSidebars = document.querySelectorAll('.sidebar');
    
    // Si ya existe más de un sidebar, no renderizar este
    if (existingSidebars.length > 1) {
      if (sidebarRef.current) {
        sidebarRef.current.remove();
      }
      return;
    }
    
    // Añadir ID único a este sidebar para identificarlo
    if (sidebarRef.current) {
      sidebarRef.current.id = SIDEBAR_ID;
    }
    
    // Detectar el tamaño de la pantalla para responsividad
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Ejecutar inmediatamente y añadir listener
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Limpiar listener al desmontar
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const navOptions = {    
    admin: [      
      { path: '/gestion-usuarios', label: 'Gestión de Administradores' },      
      { path: '/gestion-clientes', label: 'Gestión de Clientes' },      
      { path: '/gestion-conductores', label: 'Gestión de Conductores' },      
      { path: '/solicitudes-conductores', label: 'Solicitudes Conductores' },          
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
 
  const handleLogout = async () => {    
    try {      
      await signOut(auth);      
      localStorage.removeItem('userRole');      
      navigate('/login');    
    } catch (error) {      
      console.error('Error al cerrar sesión:', error);    
    }  
  };
  
  // Función para alternar la visibilidad de la barra lateral
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    // Guardar estado en localStorage para persistencia
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  // Efecto para ajustar el contenido cuando cambia el estado del sidebar
  useEffect(() => {
    if (!sidebarRef.current) return;
    
    // Guardar estado en localStorage para persistencia
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    
    // Ajustar el contenido principal con clases y variables CSS
    document.documentElement.style.setProperty(
      '--content-margin', 
      sidebarOpen ? '280px' : '0'
    );
    
    // Añadir clase al body para gestionar estilos globales
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
      document.body.classList.remove('sidebar-closed');
    } else {
      document.body.classList.add('sidebar-closed');
      document.body.classList.remove('sidebar-open');
    }
    
    // Ajustar los botones laterales
    const sideButtons = document.querySelectorAll('.side-button');
    if (sideButtons && sideButtons.length > 0) {
      sideButtons.forEach(button => {
        if (button.classList.contains('left') && sidebarOpen) {
          button.style.left = '280px';
        } else if (button.classList.contains('left') && !sidebarOpen) {
          button.style.left = '0';
        }
      });
    }
    
    // Centrar el contenido cuando el sidebar está cerrado
    const contentWrapper = document.querySelector('.content-wrapper');
    if (contentWrapper) {
      if (sidebarOpen) {
        contentWrapper.style.margin = '0 0 0 280px';
        contentWrapper.style.width = 'calc(100% - 280px)';
      } else {
        contentWrapper.style.margin = '0 auto';
        contentWrapper.style.width = '100%';
      }
    }
    
    // Detectar ancho de pantalla para ajustes responsive
    const handleScreenSize = () => {
      if (window.innerWidth <= 767) {
        // En móviles, el contenido siempre ocupa todo el ancho
        if (contentWrapper) {
          contentWrapper.style.margin = '0';
          contentWrapper.style.width = '100%';
        }
        
        // En móviles, los botones siempre están en los extremos
        if (sideButtons && sideButtons.length > 0) {
          sideButtons.forEach(button => {
            if (button.classList.contains('left')) {
              button.style.left = '0';
            }
          });
        }
      }
    };
    
    handleScreenSize();
    window.addEventListener('resize', handleScreenSize);
    
    return () => {
      window.removeEventListener('resize', handleScreenSize);
    };
  }, [sidebarOpen]);

  // Si hay más de un sidebar, no renderizar nada
  const existingSidebars = typeof document !== 'undefined' ? document.querySelectorAll('.sidebar').length : 0;
  if (existingSidebars > 1) return null;

  return (
    <>
      {/* Botón para mostrar el sidebar cuando está oculto - SIEMPRE VISIBLE */}
      <button 
        ref={toggleButtonRef}
        className={`sidebar-toggle-button ${sidebarOpen ? 'open' : 'closed'}`}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
        style={{
          left: sidebarOpen ? '280px' : '0',
          position: 'fixed',
          zIndex: 1001
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      
      <div 
        ref={sidebarRef}
        id={SIDEBAR_ID}
        className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        style={{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <div className="logo">
          <div className="logo-circle">
            <img 
              src="/logo.png" 
              alt="Viaje Seguro Logo"
              style={{
                maxWidth: '80%',
                maxHeight: '80%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
        
        <div className="user-info">        
          <div className="user-avatar"></div>
          <h3>Usuario</h3>        
          <p>{userRole === 'admin' ? 'Administrador' : 'Recepcionista'}</p>      
        </div>      
       
        <div className="nav-container">
          <nav className="nav-links">        
            {userNavOptions.map((option) => (          
              <Link
                key={option.path}
                to={option.path}
                className={`nav-button ${location.pathname === option.path ? 'active' : ''}`}
              >        
                {option.label}          
              </Link>        
            ))}      
          </nav>
        </div>
       
        <button className="nav-button logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>    
      </div>
      
      {/* Overlay para cerrar el menú en móviles cuando se toca fuera */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
    </>
  );
};
 
export default BarraNavLateral;