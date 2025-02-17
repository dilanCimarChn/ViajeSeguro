import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import './bienvenida-login.css';

function BienvenidaLogin() {
  const navigate = useNavigate(); // Hook de navegación

  const handleLoginClick = () => {
    navigate('/login'); // Redirige a la página de inicio de sesión
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <div className="logo-container">
          <img src="/helios.svg" alt="Helios Logo" className="logo" />
        </div>
        <h1 className="welcome-text">Bienvenido a ViajeSeguro</h1>
        <button className="login-button" onClick={handleLoginClick}>Inicia Sesión</button>
      </div>
    </div>
  );
}

export default BienvenidaLogin;
