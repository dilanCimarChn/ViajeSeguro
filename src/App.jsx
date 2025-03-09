import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BienvenidaLogin from './views/vlogin/bienvenida-login';
import RegLogin from './views/vlogin/reg-login';
import VistaGestionUsuarios from './views/vgestion-usuarios/gestion-usuarios';
import BarraNavLateral from './components/barra-nav-lateral/barra-nav';

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

        {/* Rutas protegidas solo si hay usuario logueado */}
        {userRole ? (
          <Route path="/gestion-usuarios" element={<LayoutWithSidebar />}>
            <Route index element={<VistaGestionUsuarios />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

// Layout con barra lateral
const LayoutWithSidebar = () => {
  return (
    <div className="app-container">
      <BarraNavLateral />
      <VistaGestionUsuarios />
    </div>
  );
};

export default App;
