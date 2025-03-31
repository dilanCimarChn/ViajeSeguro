import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc, 
  deleteDoc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import BarraNavLateral from '../../components/barra-nav-lateral/barra-nav';
import './solicitudes-conductores.css';

const VistaSolicitudesConductores = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar solicitudes desde Firestore (colección: "solicitudes_conductores")
  useEffect(() => {
    const obtenerSolicitudes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'solicitudes_conductores'));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSolicitudes(docs);
      } catch (error) {
        console.error("Error al obtener solicitudes:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerSolicitudes();
  }, []);

  // Abrir modal con detalles del conductor seleccionado
  const openModal = (conductor) => {
    setSelectedConductor(conductor);
    setModalOpen(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setSelectedConductor(null);
    setModalOpen(false);
  };

  // Función para aceptar conductor: se crea el documento en "conductores" y se elimina de "solicitudes_conductores"
  const aceptarConductor = async (id) => {
    try {
      // Obtener el documento de la solicitud
      const solicitudDocRef = doc(db, 'solicitudes_conductores', id);
      const solicitudDoc = await getDoc(solicitudDocRef);
      if (!solicitudDoc.exists()) {
        console.error("Documento de solicitud no encontrado");
        return;
      }
      const conductorData = solicitudDoc.data();

      // Crear el documento en la colección "conductores"
      // Aquí se pueden agregar campos adicionales, como fecha de registro u otros ajustes
      const nuevoConductor = {
        ...conductorData,
        estado: "Aceptado", // Podés ajustar o agregar más campos según convenga
        fechaRegistro: new Date().toISOString()
      };

      // Usamos el mismo ID para mantener consistencia (podés generar uno nuevo si lo prefieres)
      await setDoc(doc(db, 'conductores', id), nuevoConductor);

      // Eliminar la solicitud de la colección "solicitudes_conductores"
      await deleteDoc(solicitudDocRef);

      // Actualizar el estado local removiendo la solicitud aceptada
      setSolicitudes(prev => prev.filter(c => c.id !== id));
      closeModal();
    } catch (error) {
      console.error("Error al aceptar conductor:", error);
    }
  };

  // Función para rechazar conductor: actualiza el estado a "Rechazado" y elimina la solicitud de la lista
  const rechazarConductor = async (id) => {
    try {
      const solicitudDocRef = doc(db, 'solicitudes_conductores', id);
      // Actualizamos el estado a "Rechazado" (podés decidir conservar el registro en Firestore o eliminarlo)
      await updateDoc(solicitudDocRef, { estado: "Rechazado" });
      
      // Para este ejemplo, eliminamos la solicitud de la lista (podés optar por mantenerla para historial)
      setSolicitudes(prev => prev.filter(c => c.id !== id));
      closeModal();
    } catch (error) {
      console.error("Error al rechazar conductor:", error);
    }
  };

  return (
    <div className="vista-solicitudes-conductores">
      <div className="barra-nav-lateral">
        <BarraNavLateral />
      </div>
      <div className="solicitudes-conductores-container">
        <h2>Solicitudes de Conductores</h2>

        {loading ? (
          <p>Cargando solicitudes...</p>
        ) : solicitudes.length === 0 ? (
          <p>No hay solicitudes pendientes.</p>
        ) : (
          <div className="solicitudes-grid">
            {solicitudes.map((conductor) => (
              <div key={conductor.id} className="solicitud-card">
                <h3>{conductor.nombre}</h3>
                <p><strong>Email:</strong> {conductor.email}</p>
                <p><strong>Teléfono:</strong> {conductor.telefono}</p>
                <p>
                  <strong>Estado:</strong> <span className={conductor.estado.toLowerCase()}>{conductor.estado}</span>
                </p>
                <button className="btn-ver-mas" onClick={() => openModal(conductor)}>Ver Más</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para mostrar detalles de la solicitud */}
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
