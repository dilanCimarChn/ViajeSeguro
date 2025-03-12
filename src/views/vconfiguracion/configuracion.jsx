import React, { useState } from 'react';
import './configuracion.css';

const VistaConfiguracion = () => {
  const [temaOscuro, setTemaOscuro] = useState(false);
  const [notificaciones, setNotificaciones] = useState(true);

  return (
    <div className="configuracion-container">
      <h2>Configuración</h2>

      <div className="config-section">
        <h3>Cuenta</h3>
        <button>Editar Perfil</button>
        <button>Cambiar Contraseña</button>
      </div>

      <div className="config-section">
        <h3>Seguridad</h3>
        <button>Habilitar 2FA</button>
        <button>Historial de Inicios de Sesión</button>
      </div>

      <div className="config-section">
        <h3>Preferencias</h3>
        <label>
          <input type="checkbox" checked={temaOscuro} onChange={() => setTemaOscuro(!temaOscuro)} />
          Activar Modo Oscuro
        </label>
        <label>
          <input type="checkbox" checked={notificaciones} onChange={() => setNotificaciones(!notificaciones)} />
          Habilitar Notificaciones
        </label>
      </div>

      <div className="config-section">
        <h3>Sistema</h3>
        <button>Configurar Tarifas</button>
        <button>Respaldo de Datos</button>
      </div>
    </div>
  );
};

export default VistaConfiguracion;
