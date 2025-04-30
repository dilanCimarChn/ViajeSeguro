import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, userRole, rolesPermitidos }) => {
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesPermitidos.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
