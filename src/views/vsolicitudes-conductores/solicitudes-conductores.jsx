import React, { useState } from 'react';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import './solicitudes-conductores.css';

const VistaSolicitudesConductores = () => {
  // Datos ficticios de solicitudes
  const [solicitudes, setSolicitudes] = useState([
    { id: 1, nombre: "Carlos Gómez", email: "carlos.gomez@example.com", telefono: "555-1234", licencia: "LIC123456", estado: "Pendiente" },
    { id: 2, nombre: "Ana Pérez", email: "ana.perez@example.com", telefono: "555-5678", licencia: "LIC789012", estado: "Pendiente" },
    { id: 3, nombre: "Luis Fernández", email: "luis.fernandez@example.com", telefono: "555-9876", licencia: "LIC345678", estado: "Pendiente" }
  ]);

  // Estado del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Función para abrir el modal con datos del conductor
  const openModal = (conductor) => {
    setSelectedConductor(conductor);
    setModalOpen(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setSelectedConductor(null);
    setModalOpen(false);
  };

  // Función para aceptar un conductor
  const aceptarConductor = (id) => {
    setSolicitudes(solicitudes.map(conductor => 
      conductor.id === id ? { ...conductor, estado: "Aceptado" } : conductor
    ));
    closeModal();
  };

  // Función para rechazar un conductor
  const rechazarConductor = (id) => {
    setSolicitudes(solicitudes.map(conductor => 
      conductor.id === id ? { ...conductor, estado: "Rechazado" } : conductor
    ));
    closeModal();
  };

  return (
    <div className="vista-solicitudes-conductores">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="solicitudes-conductores-container">
        <h2>Solicitudes de Conductores</h2>
        <div className="solicitudes-grid">
          {solicitudes.map((conductor) => (
            <div key={conductor.id} className="solicitud-card">
              <h3>{conductor.nombre}</h3>
              <p><strong>Email:</strong> {conductor.email}</p>
              <p><strong>Teléfono:</strong> {conductor.telefono}</p>
              <p><strong>Estado:</strong> <span className={conductor.estado.toLowerCase()}>{conductor.estado}</span></p>
              <button className="btn-ver-mas" onClick={() => openModal(conductor)}>Ver Más</button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para detalles */}
      {modalOpen && selectedConductor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <span className="close-modal" onClick={closeModal}>&times;</span>
            <h3>Detalles de la Solicitud</h3>
            <p><strong>Nombre:</strong> {selectedConductor.nombre}</p>
            <p><strong>Email:</strong> {selectedConductor.email}</p>
            <p><strong>Teléfono:</strong> {selectedConductor.telefono}</p>
            <p><strong>Licencia:</strong> {selectedConductor.licencia}</p>
            <p><strong>Estado:</strong> {selectedConductor.estado}</p>
            <div className="modal-buttons">
              <button className="btn-aceptar" onClick={() => aceptarConductor(selectedConductor.id)}>Aceptar</button>
              <button className="btn-rechazar" onClick={() => rechazarConductor(selectedConductor.id)}>Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaSolicitudesConductores;
