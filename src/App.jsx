import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BienvenidaLogin from './views/vlogin/bienvenida-login';
import RegLogin from './views/vlogin/reg-login';
import VistaGestionUsuarios from './views/vgestion-usuarios/gestion-usuarios';
import BarraNavLateral from './components/barra-nav-lateral/barra-nav';

// Tu lógica de almacenamiento de rol
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
        <Route path="/login" element={<RegLogin />} />

        {/* Rutas protegidas con BarraNavLateral */}
        {userRole && (
          <Route element={<LayoutWithSidebar />}>
            <Route path="gestion-usuarios" element={<VistaGestionUsuarios />} />
          </Route>
        )}

        {/* Redirección si la ruta no existe */}
        <Route path="*" element={<Navigate to={userRole ? '/gestion-usuarios' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

// Componente que envuelve las rutas protegidas y muestra la Barra de Navegación.
const LayoutWithSidebar = () => {
  return (
    <div className="app-container">
      <BarraNavLateral />
      <Routes>
        <Route path="gestion-usuarios" element={<VistaGestionUsuarios />} />
      </Routes>
    </div>
  );
};

export default App;
