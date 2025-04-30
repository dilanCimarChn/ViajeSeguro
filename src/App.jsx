import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BienvenidaLogin from './views/vlogin/bienvenida-login';
import RegLogin from './views/vlogin/reg-login';
import GestionUsuarios from './components/gestion-usuarios/gestion-usuarios.jsx';
import VistaGestionClientes from './views/vgestion-clientes/gestion-clientes.jsx';
import GestionConductores from './components/gestion-conductores/gestion-conductores.jsx';
import VistaSolicitudesConductores from './views/vsolicitudes-conductores/solicitudes-conductores';
import VistaPerfilCliente from './views/vperfil-cliente/perfil-cliente';
import VistaViajesTiempoReal from './views/vviajes-en-tiempo-real/viajes-tiempo-real';
import GrabacionesCamara from './components/camara/GrabacionesCamara.jsx';
import VistaConfiguracion from './views/vconfiguracion/configuracion';
import Reportes from './components/reportes/reportes.jsx';
import DashboardLayout from './components/barra-nav-lateral/Layout.jsx';
import PrivateRoute from '../src/PrivateRoute.jsx'

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
        <Route path="/login" element={<RegLogin setUserRole={setUserRole} />} />

        {/* Rutas protegidas para ADMIN */}
        <Route path="/gestion-usuarios" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin']}>
            <DashboardLayout><GestionUsuarios /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/reportes" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin']}>
            <DashboardLayout><Reportes /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/viajes-tiempo-real" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin']}>
            <DashboardLayout><VistaViajesTiempoReal /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/perfil-cliente" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin']}>
            <DashboardLayout><VistaPerfilCliente /></DashboardLayout>
          </PrivateRoute>
        } />

        {/* Rutas compartidas entre ADMIN y RECEPTIONIST */}
        <Route path="/gestion-clientes" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin', 'receptionist']}>
            <DashboardLayout><VistaGestionClientes /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/gestion-conductores" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin', 'receptionist']}>
            <DashboardLayout><GestionConductores /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/solicitudes-conductores" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin', 'receptionist']}>
            <DashboardLayout><VistaSolicitudesConductores /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/grabaciones-camara" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin', 'receptionist']}>
            <DashboardLayout><GrabacionesCamara /></DashboardLayout>
          </PrivateRoute>
        } />

        <Route path="/configuracion" element={
          <PrivateRoute userRole={userRole} rolesPermitidos={['admin', 'receptionist']}>
            <DashboardLayout><VistaConfiguracion /></DashboardLayout>
          </PrivateRoute>
        } />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
