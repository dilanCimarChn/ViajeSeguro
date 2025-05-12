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
import DashboardLayout from './components/barra-nav-lateral/Layout.jsx';
import { getAuth, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    // Deshabilitar persistencia de la sesión para evitar que se mantenga
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error deshabilitando persistencia de sesión:", error);
        setLoading(false);
      });
  }, [auth]);

  const handleLogout = async () => {
    try {
      console.log("Iniciando proceso de logout desde App");
      
      // 1. Limpiar almacenamiento local primero
      localStorage.removeItem('userRole');
      
      // 2. Actualizar estado para desmontar componentes
      setUserRole(null);
      
      // 3. Cerrar sesión de Firebase
      await signOut(auth);
      
      // 4. Usar una redirección dura para evitar problemas con react-router
      window.location.href = '/login';
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<RegLogin setUserRole={setUserRole} />} />

        {/* Rutas protegidas según el rol */}
        {userRole === 'admin' && (
          <>
            <Route path="/gestion-usuarios" element={<DashboardLayout handleLogout={handleLogout}><GestionUsuarios /></DashboardLayout>} />
            <Route path="/gestion-clientes" element={<DashboardLayout handleLogout={handleLogout}><VistaGestionClientes /></DashboardLayout>} />
            <Route path="/gestion-conductores" element={<DashboardLayout handleLogout={handleLogout}><GestionConductores /></DashboardLayout>} />
            <Route path="/solicitudes-conductores" element={<DashboardLayout handleLogout={handleLogout}><VistaSolicitudesConductores /></DashboardLayout>} />
            <Route path="/perfil-cliente" element={<DashboardLayout handleLogout={handleLogout}><VistaPerfilCliente /></DashboardLayout>} />
            <Route path="/viajes-tiempo-real" element={<DashboardLayout handleLogout={handleLogout}><VistaViajesTiempoReal /></DashboardLayout>} />
            <Route path="/grabaciones-camara" element={<DashboardLayout handleLogout={handleLogout}><GrabacionesCamara /></DashboardLayout>} />
            <Route path="/reportes" element={<DashboardLayout handleLogout={handleLogout}><Reportes /></DashboardLayout>} />
            <Route path="/configuracion" element={<DashboardLayout handleLogout={handleLogout}><VistaConfiguracion /></DashboardLayout>} />
          </>
        )}

        {userRole === 'receptionist' && (
          <>
            <Route path="/gestion-clientes" element={<DashboardLayout handleLogout={handleLogout}><VistaGestionClientes /></DashboardLayout>} />
            <Route path="/gestion-conductores" element={<DashboardLayout handleLogout={handleLogout}><GestionConductores /></DashboardLayout>} />
            <Route path="/solicitudes-conductores" element={<DashboardLayout handleLogout={handleLogout}><VistaSolicitudesConductores /></DashboardLayout>} />
            <Route path="/grabaciones-camara" element={<DashboardLayout handleLogout={handleLogout}><GrabacionesCamara /></DashboardLayout>} />
            <Route path="/configuracion" element={<DashboardLayout handleLogout={handleLogout}><VistaConfiguracion /></DashboardLayout>} />
          </>
        )}

        {/* Redirigir a login si no hay sesión */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
