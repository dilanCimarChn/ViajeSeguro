import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BienvenidaLogin from './views/vlogin/bienvenida-login';
import RegLogin from './views/vlogin/reg-login';
import GestionUsuarios from './components/gestion-usuarios/gestion-usuarios.jsx'
import VistaGestionClientes from './views/vgestion-clientes/gestion-clientes.jsx';
import GestionConductores from './components/gestion-conductores/gestion-conductores.jsx';
import VistaSolicitudesConductores from './views/vsolicitudes-conductores/solicitudes-conductores';
import VistaPerfilCliente from './views/vperfil-cliente/perfil-cliente';
import VistaViajesTiempoReal from './views/vviajes-en-tiempo-real/viajes-tiempo-real';
import GrabacionesCamara from './components/camara/GrabacionesCamara.jsx';
import VistaConfiguracion from './views/vconfiguracion/configuracion';
import Reportes from './components/reportes/reportes.jsx';
// Importar el DashboardLayout en lugar de BarraNavLateral
import DashboardLayout from './components/barra-nav-lateral/Layout.jsx';

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

        {/* Rutas protegidas según el rol */}
        {userRole === 'admin' && (
          <>
            <Route path="/gestion-usuarios" element={<DashboardLayout><GestionUsuarios /></DashboardLayout>} />
            <Route path="/gestion-clientes" element={<DashboardLayout><VistaGestionClientes /></DashboardLayout>} />
            <Route path="/gestion-conductores" element={<DashboardLayout><GestionConductores /></DashboardLayout>} />
            <Route path="/solicitudes-conductores" element={<DashboardLayout><VistaSolicitudesConductores /></DashboardLayout>} />
            <Route path="/perfil-cliente" element={<DashboardLayout><VistaPerfilCliente /></DashboardLayout>} />
            <Route path="/viajes-tiempo-real" element={<DashboardLayout><VistaViajesTiempoReal /></DashboardLayout>} />
            <Route path="/grabaciones-camara" element={<DashboardLayout><GrabacionesCamara /></DashboardLayout>} />
            <Route path="/reportes" element={<DashboardLayout><Reportes /></DashboardLayout>} />
            <Route path="/configuracion" element={<DashboardLayout><VistaConfiguracion /></DashboardLayout>} />
          </>
        )}

        {userRole === 'receptionist' && (
          <>
            <Route path="/gestion-clientes" element={<DashboardLayout><VistaGestionClientes /></DashboardLayout>} />
            <Route path="/gestion-conductores" element={<DashboardLayout><VistaGestionConductores /></DashboardLayout>} />
            <Route path="/solicitudes-conductores" element={<DashboardLayout><VistaSolicitudesConductores /></DashboardLayout>} />
            <Route path="/grabaciones-camara" element={<DashboardLayout><GrabacionesCamara /></DashboardLayout>} />
            <Route path="/configuracion" element={<DashboardLayout><VistaConfiguracion /></DashboardLayout>} />
          </>
        )}

        {/* Redirigir a login si no hay sesión */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}


export default App;