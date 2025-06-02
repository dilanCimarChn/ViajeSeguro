// App.jsx - VERSIÓN ACTUALIZADA CON PERFIL DE USUARIO
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
import PerfilUsuario from './components/perfil-usuario/perfil-Usuario.jsx'; 
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

  // 🆕 FUNCIÓN HELPER ACTUALIZADA CON LA NUEVA RUTA
  const hasPermission = (route) => {
    if (!userRole) return false;
    
    const adminRoutes = [
      '/gestion-usuarios', '/gestion-clientes', '/gestion-conductores',
      '/solicitudes-conductores', '/perfil-cliente', '/viajes-tiempo-real',
      '/grabaciones-camara', '/reportes', '/configuracion', '/mi-perfil' // 🆕 AGREGADO
    ];
    
    const receptionistRoutes = [
      '/gestion-clientes', '/gestion-conductores', '/solicitudes-conductores',
      '/grabaciones-camara', '/configuracion', '/mi-perfil' // 🆕 AGREGADO
    ];
    
    if (userRole === 'admin') {
      return adminRoutes.includes(route);
    }
    
    if (userRole === 'receptionist') {
      return receptionistRoutes.includes(route);
    }
    
    return false;
  };

  // Componente para rutas protegidas
  const ProtectedRoute = ({ children, path }) => {
    if (!userRole) {
      return <Navigate to="/login" replace />;
    }
    
    if (!hasPermission(path)) {
      return <Navigate to="/login" replace />;
    }
    
    return (
      <DashboardLayout handleLogout={handleLogout}>
        {children}
      </DashboardLayout>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Ruta pública */}
        <Route 
          path="/login" 
          element={<RegLogin setUserRole={setUserRole} />} 
        />

        {/* 🆕 NUEVA RUTA PARA PERFIL DE USUARIO */}
        <Route 
          path="/mi-perfil" 
          element={
            <ProtectedRoute path="/mi-perfil">
              <PerfilUsuario />
            </ProtectedRoute>
          } 
        />

        {/* Rutas protegidas para Admin */}
        <Route 
          path="/gestion-usuarios" 
          element={
            <ProtectedRoute path="/gestion-usuarios">
              <GestionUsuarios />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/gestion-clientes" 
          element={
            <ProtectedRoute path="/gestion-clientes">
              <VistaGestionClientes />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/gestion-conductores" 
          element={
            <ProtectedRoute path="/gestion-conductores">
              <GestionConductores />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/solicitudes-conductores" 
          element={
            <ProtectedRoute path="/solicitudes-conductores">
              <VistaSolicitudesConductores />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/perfil-cliente" 
          element={
            <ProtectedRoute path="/perfil-cliente">
              <VistaPerfilCliente />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/viajes-tiempo-real" 
          element={
            <ProtectedRoute path="/viajes-tiempo-real">
              <VistaViajesTiempoReal />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/grabaciones-camara" 
          element={
            <ProtectedRoute path="/grabaciones-camara">
              <GrabacionesCamara />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reportes" 
          element={
            <ProtectedRoute path="/reportes">
              <Reportes />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/configuracion" 
          element={
            <ProtectedRoute path="/configuracion">
              <VistaConfiguracion />
            </ProtectedRoute>
          } 
        />

        {/* Ruta por defecto */}
        <Route 
          path="/" 
          element={<Navigate to="/login" replace />} 
        />
        
        {/* Capturar todas las rutas no encontradas */}
        <Route 
          path="*" 
          element={<Navigate to="/login" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;