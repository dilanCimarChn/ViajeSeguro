import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BienvenidaLogin from './views/vlogin/bienvenida-login';
import RegLogin from './views/vlogin/reg-login';
import VistaGestionUsuarios from './views/vgestion-usuarios/gestion-usuarios';
import VistaGestionClientes from './views/vgestion-clientes/gestion-clientes.jsx';
import VistaGestionConductores from './views/vgestion-conductores/gestion-conductores';
import VistaSolicitudesConductores from './views/vsolicitudes-conductores/solicitudes-conductores';
import VistaViajesTiempoReal from './views/vviajes-en-tiempo-real/viajes-tiempo-real';
import VistaReportes from './views/vreportes/reportes';
import VistaConfiguracion from './views/vconfiguracion/configuracion';
import BarraNavLateral from './components/barra-nav-lateral/barra-nav';

// Layout con barra lateral - IMPORTANTE: Definimos esto primero antes de usarlos
const LayoutWithSidebar = ({ children }) => {
  return (
    <div className="app-container">
      <BarraNavLateral />
      <div className="content-wrapper" style={{ marginLeft: '280px', padding: '20px' }}>
        {children}
      </div>
    </div>
  );
};

function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    setLoading(false);
  }, []);
 
  if (loading) {
    return <div>Cargando...</div>;
  }
 
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<BienvenidaLogin />} />
        <Route path="/login" element={<RegLogin setUserRole={setUserRole} />} />
       
        {/* Rutas protegidas para administradores */}
        {userRole === 'admin' && (
          <>
            <Route path="/gestion-usuarios" element={<LayoutWithSidebar><VistaGestionUsuarios /></LayoutWithSidebar>} />
            <Route path="/gestion-clientes" element={<LayoutWithSidebar><VistaGestionClientes /></LayoutWithSidebar>} />
            <Route path="/gestion-conductores" element={<LayoutWithSidebar><VistaGestionConductores /></LayoutWithSidebar>} />
            <Route path="/solicitudes-conductores" element={<LayoutWithSidebar><VistaSolicitudesConductores /></LayoutWithSidebar>} />
            <Route path="/viajes-tiempo-real" element={<LayoutWithSidebar><VistaViajesTiempoReal /></LayoutWithSidebar>} />
            <Route path="/reportes" element={<LayoutWithSidebar><VistaReportes /></LayoutWithSidebar>} />
            <Route path="/configuracion" element={<LayoutWithSidebar><VistaConfiguracion /></LayoutWithSidebar>} />
          </>
        )}
       
        {/* Rutas protegidas para recepcionistas */}
        {userRole === 'receptionist' && (
          <>
            <Route path="/gestion-clientes" element={<LayoutWithSidebar><VistaGestionClientes /></LayoutWithSidebar>} />
            <Route path="/gestion-conductores" element={<LayoutWithSidebar><VistaGestionConductores /></LayoutWithSidebar>} />
            <Route path="/solicitudes-conductores" element={<LayoutWithSidebar><VistaSolicitudesConductores /></LayoutWithSidebar>} />
            <Route path="/configuracion" element={<LayoutWithSidebar><VistaConfiguracion /></LayoutWithSidebar>} />
          </>
        )}
       
        {/* Redirigir a login si no hay sesión o si la ruta no existe */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;