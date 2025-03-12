import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./reportes.css";

const Reportes = () => {
  const [activeTab, setActiveTab] = useState("viajes");

  // Datos ficticios para gráficos
  const viajesData = [
    { fecha: "01 Mar", viajes: 10 },
    { fecha: "02 Mar", viajes: 15 },
    { fecha: "03 Mar", viajes: 7 },
    { fecha: "04 Mar", viajes: 12 },
    { fecha: "05 Mar", viajes: 18 },
  ];

  const actividadUsuarios = [
    { usuario: "Juan", sesiones: 5 },
    { usuario: "María", sesiones: 8 },
    { usuario: "Carlos", sesiones: 3 },
    { usuario: "Laura", sesiones: 6 },
  ];

  const gestionAdministradores = [
    { categoria: "Usuarios", cantidad: 50 },
    { categoria: "Pagos", cantidad: 120 },
    { categoria: "Grabaciones", cantidad: 30 },
  ];

  return (
    <div className="reportes-container">
      <h2>📊 Módulo de Reportes y Estadísticas</h2>

      {/* Pestañas */}
      <div className="tabs">
        <button
          className={activeTab === "viajes" ? "active" : ""}
          onClick={() => setActiveTab("viajes")}
        >
          Historial de Viajes
        </button>
        <button
          className={activeTab === "actividad" ? "active" : ""}
          onClick={() => setActiveTab("actividad")}
        >
          Actividad de Usuarios
        </button>
        <button
          className={activeTab === "gestion" ? "active" : ""}
          onClick={() => setActiveTab("gestion")}
        >
          Gestión de Administradores
        </button>
      </div>

      {/* Contenido de Reportes */}
      <div className="report-content">
        {activeTab === "viajes" && (
          <div>
            <h3>🚖 Historial de Viajes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viajesData}>
                <XAxis dataKey="fecha" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="viajes" stroke="#007BFF" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === "actividad" && (
          <div>
            <h3>📱 Actividad de Usuarios</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actividadUsuarios}>
                <XAxis dataKey="usuario" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Bar dataKey="sesiones" fill="#28A745" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === "gestion" && (
          <div>
            <h3>⚙️ Gestión de Administradores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gestionAdministradores}>
                <XAxis dataKey="categoria" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#DC3545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reportes;
