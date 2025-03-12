import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './viajes-tiempo-real.css';

const VistaViajesTiempoReal = () => {
  const [viajes, setViajes] = useState([]);
  const [posiciones, setPosiciones] = useState([]);

  // Datos ficticios de viajes en curso
  useEffect(() => {
    setViajes([
      { id: 1, conductor: 'Carlos Gómez', destino: 'Centro Comercial', estado: 'En Curso', lat: -16.505, lng: -68.130 },
      { id: 2, conductor: 'María Pérez', destino: 'Aeropuerto', estado: 'Pendiente', lat: -16.500, lng: -68.145 },
    ]);

    setPosiciones([
      { id: 1, lat: -16.505, lng: -68.130, conductor: 'Carlos Gómez' },
      { id: 2, lat: -16.500, lng: -68.145, conductor: 'María Pérez' },
    ]);
  }, []);

  // Datos ficticios para estadísticas de viajes
  const data = [
    { fecha: '2025-03-01', viajes: 10 },
    { fecha: '2025-03-02', viajes: 15 },
    { fecha: '2025-03-03', viajes: 20 },
    { fecha: '2025-03-04', viajes: 17 },
  ];

  return (
    <div className="viajes-container">
      <h2>Viajes en Tiempo Real</h2>

      {/* Mapa de Viajes */}
      <div className="map-section">
        <h3>Mapa de Conductores</h3>
        <MapContainer center={[-16.505, -68.130]} zoom={13} className="map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {posiciones.map((pos) => (
            <Marker key={pos.id} position={[pos.lat, pos.lng]}>
              <Popup>{pos.conductor}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Lista de Viajes Activos */}
      <div className="viajes-list">
        <h3>Lista de Viajes Activos</h3>
        <ul>
          {viajes.map((viaje) => (
            <li key={viaje.id} className={`viaje-card ${viaje.estado.toLowerCase()}`}>
              <strong>Conductor:</strong> {viaje.conductor} <br />
              <strong>Destino:</strong> {viaje.destino} <br />
              <strong>Estado:</strong> {viaje.estado}
            </li>
          ))}
        </ul>
      </div>

      {/* Gráfico de Estadísticas */}
      <div className="grafico-viajes">
        <h3>Historial de Viajes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="viajes" stroke="#007BFF" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VistaViajesTiempoReal;
