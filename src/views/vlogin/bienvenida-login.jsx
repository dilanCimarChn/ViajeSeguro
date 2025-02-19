import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import './bienvenida-login.css';  // Asegúrate de que la ruta sea correcta

function BienvenidaLogin() {
  const navigate = useNavigate(); // Hook de navegación

  const handleLoginClick = () => {
    navigate('/login'); // Redirige a la página de inicio de sesión
  };

  return (
    <div className="bienvenida-login-background">
      <div className="bienvenida-login-container">
        <div className="logo-container">
          <img src="/viajeseguro.svg" alt="viajeseguroiaje Seguro" className="logo" />
        </div>
        <h1 className="welcome-text">Bienvenido a ViajeSegu</h1>
        <button className="bienvenida-login-button" onClick={handleLoginClick}>Inicia Sesión</button>
      </div>
    </div>
  );
}

export default BienvenidaLogin;
