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

  return (     
    <div className="sidebar">       
      <div className="logo">         
        <img 
          src="https://i.ibb.co/xtN8mjLv/logo.png" 
          alt="Viaje Seguro" 
          className="logo-image" 
        />         
        <h2>VIAJE SEGURO</h2>         
        <p>PANEL DE {userRole === 'admin' ? 'ADMINISTRADOR' : 'RECEPCIONISTA'}</p>       
      </div>       
      <div className="user-info">         
           
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