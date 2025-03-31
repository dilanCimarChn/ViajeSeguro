import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './gestion-clientes.css';

const GestionClientes = () => {
  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true,
    fechaRegistro: new Date().toISOString()
  });

  // Estados para gestionar clientes
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentClienteId, setCurrentClienteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState({});
  
  // Estados para el perfil de cliente
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [historialViajes, setHistorialViajes] = useState([]);
  const [comentariosConductores, setComentariosConductores] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Obtener clientes de Firebase
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(clientesData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Manejador de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Crear o actualizar cliente
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.telefono) {
      alert('Los campos Nombre, Email y Teléfono son obligatorios.');
      return;
    }

    setLoading(true);
    
    try {
      if (editMode && currentClienteId) {
        // Actualizar cliente existente
        await updateDoc(doc(db, 'clientes', currentClienteId), {
          ...formData,
          fechaActualizacion: new Date().toISOString()
        });
        alert('Cliente actualizado correctamente.');
      } else {
        // Verificar si el email ya existe
        const emailQuery = query(collection(db, 'clientes'), where('email', '==', formData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          alert('Ya existe un cliente con este correo electrónico.');
          setLoading(false);
          return;
        }
        
        // Crear nuevo cliente
        const docRef = await addDoc(collection(db, 'clientes'), formData);
        
        // Creamos automáticamente la colección de historial de viajes y comentarios
        await addDoc(collection(db, 'viajes'), {
          clienteId: docRef.id,
          fecha: Timestamp.now(),
          origen: 'Registro inicial',
          destino: 'N/A',
          estado: 'completado',
          calificacion: 5
        });
        
        alert('Cliente agregado correctamente.');
      }
      
      // Resetear el formulario
      resetForm();
    } catch (error) {
      console.error('Error al procesar cliente:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      activo: true,
      fechaRegistro: new Date().toISOString()
    });
    setEditMode(false);
    setCurrentClienteId(null);
  };

  // Cambiar estado de activación de cliente
  const toggleAccountStatus = async (clienteId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'clientes', clienteId), { 
        activo: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });
      alert(`Cliente ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar estado del cliente.');
    }
  };

  // Eliminar cliente
  const deleteCliente = async (clienteId) => {
    if (window.confirm('¿Está seguro que desea eliminar este cliente? Esta acción no se puede deshacer.')) {
      try {
        // Verificar si tiene viajes asociados
        const viajesQuery = query(collection(db, 'viajes'), where('clienteId', '==', clienteId));
        const viajesSnapshot = await getDocs(viajesQuery);
        
        if (!viajesSnapshot.empty) {
          if (!window.confirm('Este cliente tiene viajes asociados. ¿Desea eliminarlo de todas formas?')) {
            return;
          }
          
          // Eliminar todos los viajes asociados
          for (const doc of viajesSnapshot.docs) {
            await deleteDoc(doc.ref);
          }
        }
        
        // Eliminar comentarios asociados
        const comentariosQuery = query(collection(db, 'comentarios'), where('clienteId', '==', clienteId));
        const comentariosSnapshot = await getDocs(comentariosQuery);
        
        for (const doc of comentariosSnapshot.docs) {
          await deleteDoc(doc.ref);
        }
        
        // Finalmente eliminar el cliente
        await deleteDoc(doc(db, 'clientes', clienteId));
        alert('Cliente eliminado correctamente.');
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        alert('Error al eliminar cliente.');
      }
    }
  };

  // Cargar cliente para editar
  const loadClienteForEdit = async (clienteId) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', clienteId));
      
      if (clienteDoc.exists()) {
        setFormData(clienteDoc.data());
        setEditMode(true);
        setCurrentClienteId(clienteId);
      } else {
        alert('El cliente no existe.');
      }
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      alert('Error al cargar datos del cliente.');
    }
  };
  
  // Toggle para mostrar detalles
  const toggleDetails = (clienteId) => {
    setShowDetails(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  // Ver perfil de cliente
  const verPerfil = async (clienteId) => {
    try {
      setLoading(true);
      
      // Obtener datos del cliente
      const clienteDoc = await getDoc(doc(db, 'clientes', clienteId));
      
      if (!clienteDoc.exists()) {
        alert('El cliente no existe en la base de datos.');
        setLoading(false);
        return;
      }
      
      const clienteData = { id: clienteDoc.id, ...clienteDoc.data() };
      setSelectedCliente(clienteData);
      
      // Cargar historial de viajes
      const viajesQuery = query(
        collection(db, 'viajes'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc'),
        limit(10)
      );
      
      const viajesSnapshot = await getDocs(viajesQuery);
      const viajesData = viajesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setHistorialViajes(viajesData);
      
      // Cargar comentarios
      const comentariosQuery = query(
        collection(db, 'comentarios'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc')
      );
      
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosData = comentariosSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setComentariosConductores(comentariosData);
      
      // Mostrar modal
      setShowPerfilModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      alert('Error al cargar perfil del cliente.');
      setLoading(false);
    }
  };

  // Añadir comentario de conductor
  const handleAddComentario = async (e) => {
    e.preventDefault();
    
    if (!nuevoComentario.trim()) {
      alert('Por favor, escriba un comentario.');
      return;
    }
    
    try {
      // En un caso real, este ID vendría del conductor que está logueado
      const demoSelectedConductorId = "conductor-demo-id";
      
      await addDoc(collection(db, 'comentarios'), {
        clienteId: selectedCliente.id,
        conductorId: demoSelectedConductorId,
        conductor: "Conductor Demo", // En un caso real, esto vendría de la BD
        mensaje: nuevoComentario,
        fecha: Timestamp.now()
      });
      
      setNuevoComentario('');
      
      // Recargar los comentarios
      const comentariosQuery = query(
        collection(db, 'comentarios'),
        where('clienteId', '==', selectedCliente.id),
        orderBy('fecha', 'desc')
      );
      
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosData = comentariosSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
      }));
      
      setComentariosConductores(comentariosData);
      
      alert('Comentario añadido correctamente.');
    } catch (error) {
      console.error('Error al añadir comentario:', error);
      alert('Error al añadir comentario.');
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar clientes por término de búsqueda
  const filteredClientes = clientes.filter(cliente => 
    cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono?.includes(searchTerm)
  );

  return (
    <div className="gestion-clientes">
      <h2>{editMode ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h2>
      
      <form onSubmit={handleSubmit} className="gestion-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input 
              type="text" 
              id="nombre"
              name="nombre" 
              placeholder="Nombre Completo" 
              value={formData.nombre} 
              onChange={handleInputChange} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              type="email" 
              id="email"
              name="email" 
              placeholder="Correo Electrónico" 
              value={formData.email} 
              onChange={handleInputChange} 
              required 
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input 
              type="tel" 
              id="telefono"
              name="telefono" 
              placeholder="Teléfono" 
              value={formData.telefono} 
              onChange={handleInputChange} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <input 
              type="text" 
              id="direccion"
              name="direccion" 
              placeholder="Dirección" 
              value={formData.direccion} 
              onChange={handleInputChange} 
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="checkbox-container">
            <label>
              <input 
                type="checkbox" 
                name="activo" 
                checked={formData.activo} 
                onChange={handleInputChange} 
              />
              Cliente Activo
            </label>
          </div>
        </div>
        
        <div className="form-buttons">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Procesando...' : (editMode ? 'Actualizar Cliente' : 'Agregar Cliente')}
          </button>
          
          {editMode && (
            <button type="button" onClick={resetForm} className="btn-cancel">
              Cancelar
            </button>
          )}
        </div>
      </form>
      
      <div className="search-container">
        <h3>Clientes Registrados</h3>
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      {loading && <p className="loading-message">Cargando clientes...</p>}
      
      {!loading && filteredClientes.length === 0 && (
        <p className="no-results">No hay clientes que coincidan con la búsqueda.</p>
      )}
      
      {!loading && filteredClientes.length > 0 && (
        <>
          {/* Vista de escritorio: Tabla */}
          <div className="tabla-container desktop-view">
            <table className="tabla-clientes">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map(cliente => (
                  <React.Fragment key={cliente.id}>
                    <tr className={cliente.activo ? 'cliente-activo' : 'cliente-inactivo'}>
                      <td>{cliente.nombre}</td>
                      <td>{cliente.email}</td>
                      <td>{cliente.telefono}</td>
                      <td>
                        <span className={`status-badge ${cliente.activo ? 'active' : 'inactive'}`}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          onClick={() => toggleDetails(cliente.id)} 
                          className="btn-details"
                          aria-label="Ver detalles"
                          title="Ver detalles"
                        >
                          <i className="fa fa-info-circle"></i>
                        </button>
                        <button 
                          onClick={() => loadClienteForEdit(cliente.id)} 
                          className="btn-edit"
                          aria-label="Editar cliente"
                          title="Editar cliente"
                        >
                          <i className="fa fa-pencil"></i>
                        </button>
                        <button 
                          onClick={() => toggleAccountStatus(cliente.id, cliente.activo)} 
                          className={cliente.activo ? 'btn-deactivate' : 'btn-activate'}
                          aria-label={cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}
                          title={cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}
                        >
                          <i className={cliente.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        </button>
                        <button 
                          onClick={() => deleteCliente(cliente.id)} 
                          className="btn-delete"
                          aria-label="Eliminar cliente"
                          title="Eliminar cliente"
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                        <button 
                          onClick={() => verPerfil(cliente.id)} 
                          className="btn-perfil"
                          aria-label="Ver perfil completo"
                          title="Ver perfil completo"
                        >
                          <i className="fa fa-user"></i>
                        </button>
                      </td>
                    </tr>
                    
                    {/* Fila expandible con detalles */}
                    {showDetails[cliente.id] && (
                      <tr className="details-row">
                        <td colSpan="5">
                          <div className="cliente-details">
                            <p><strong>Dirección:</strong> {cliente.direccion || 'No especificada'}</p>
                            <p><strong>Fecha de Registro:</strong> {
                              cliente.fechaRegistro ? 
                                formatDate(cliente.fechaRegistro) : 
                                'Fecha desconocida'
                            }</p>
                            {cliente.fechaActualizacion && (
                              <p><strong>Última Actualización:</strong> {
                                formatDate(cliente.fechaActualizacion)
                              }</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Vista móvil: Tarjetas */}
          <div className="mobile-view">
            {filteredClientes.map(cliente => (
              <div 
                key={cliente.id} 
                className={`cliente-card ${cliente.activo ? 'card-activo' : 'card-inactivo'}`}
              >
                <div className="card-header">
                  <h4>{cliente.nombre}</h4>
                  <span className={`status-badge ${cliente.activo ? 'active' : 'inactive'}`}>
                    {cliente.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="card-body">
                  <p><i className="fa fa-envelope"></i> {cliente.email}</p>
                  <p><i className="fa fa-phone"></i> {cliente.telefono}</p>
                  {showDetails[cliente.id] && (
                    <div className="card-details">
                      <p><i className="fa fa-map-marker"></i> {cliente.direccion || 'Dirección no especificada'}</p>
                      <p><i className="fa fa-calendar"></i> Registro: {
                        cliente.fechaRegistro ? 
                          formatDate(cliente.fechaRegistro) : 
                          'Fecha desconocida'
                      }</p>
                      {cliente.fechaActualizacion && (
                        <p><i className="fa fa-refresh"></i> Actualización: {
                          formatDate(cliente.fechaActualizacion)
                        }</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="card-actions">
                  <button 
                    onClick={() => toggleDetails(cliente.id)} 
                    className="btn-details"
                  >
                    {showDetails[cliente.id] ? 'Ocultar' : 'Detalles'}
                  </button>
                  <button 
                    onClick={() => loadClienteForEdit(cliente.id)} 
                    className="btn-edit"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => toggleAccountStatus(cliente.id, cliente.activo)} 
                    className={cliente.activo ? 'btn-deactivate' : 'btn-activate'}
                  >
                    {cliente.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button 
                    onClick={() => deleteCliente(cliente.id)} 
                    className="btn-delete"
                  >
                    Eliminar
                  </button>
                  <button 
                    onClick={() => verPerfil(cliente.id)} 
                    className="btn-perfil"
                  >
                    Ver Perfil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Modal para Perfil de Cliente */}
      {showPerfilModal && selectedCliente && (
        <div className="perfil-modal">
          <div className="perfil-modal-content">
            <div className="perfil-modal-header">
              <h3>Perfil del Cliente</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowPerfilModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="perfil-modal-body">
              {/* Tabs de navegación */}
              <div className="perfil-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  Información
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'viajes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('viajes')}
                >
                  Historial de Viajes
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'comentarios' ? 'active' : ''}`}
                  onClick={() => setActiveTab('comentarios')}
                >
                  Comentarios
                </button>
              </div>
              
              {/* Contenido de las tabs */}
              <div className="tab-content">
                {/* Tab de Información */}
                {activeTab === 'info' && (
                  <div className="info-tab">
                    <div className="info-card">
                      <h4>Datos Personales</h4>
                      <p><strong>Nombre:</strong> {selectedCliente.nombre}</p>
                      <p><strong>Email:</strong> {selectedCliente.email}</p>
                      <p><strong>Teléfono:</strong> {selectedCliente.telefono}</p>
                      <p><strong>Dirección:</strong> {selectedCliente.direccion || 'No especificada'}</p>
                      <p><strong>Estado:</strong> {selectedCliente.activo ? 'Activo' : 'Inactivo'}</p>
                      <p><strong>Fecha de Registro:</strong> {
                        selectedCliente.fechaRegistro ? 
                          formatDate(selectedCliente.fechaRegistro) : 
                          'Fecha desconocida'
                      }</p>
                      {selectedCliente.fechaActualizacion && (
                        <p><strong>Última Actualización:</strong> {
                          formatDate(selectedCliente.fechaActualizacion)
                        }</p>
                      )}
                    </div>
                    
                    <div className="actions-card">
                      <h4>Acciones Rápidas</h4>
                      <div className="quick-actions">
                        <button 
                          onClick={() => {
                            loadClienteForEdit(selectedCliente.id);
                            setShowPerfilModal(false);
                          }} 
                          className="btn-edit"
                        >
                          Editar Información
                        </button>
                        <button 
                          onClick={() => {
                            toggleAccountStatus(selectedCliente.id, selectedCliente.activo);
                            setShowPerfilModal(false);
                          }} 
                          className={selectedCliente.activo ? 'btn-deactivate' : 'btn-activate'}
                        >
                          {selectedCliente.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tab de Historial de Viajes */}
                {activeTab === 'viajes' && (
                  <div className="viajes-tab">
                    <h4>Historial de Viajes</h4>
                    {historialViajes.length > 0 ? (
                      <ul className="viajes-list">
                        {historialViajes.map((viaje) => (
                          <li key={viaje.id} className="viaje-item">
                            <div className="viaje-info">
                              <div className="viaje-fecha">{viaje.fecha}</div>
                              <div className="viaje-ruta">
                                <span className="origen">{viaje.origen || 'Origen no especificado'}</span>
                                <span className="separator">➝</span>
                                <span className="destino">{viaje.destino || 'Destino no especificado'}</span>
                              </div>
                              {viaje.calificacion && (
                                <div className="viaje-calificacion">
                                  {Array(5).fill().map((_, i) => (
                                    <span key={i} className={i < viaje.calificacion ? "star filled" : "star"}>★</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {viaje.conductorNombre && (
                              <div className="viaje-conductor">
                                <strong>Conductor:</strong> {viaje.conductorNombre}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No hay viajes registrados para este cliente.</p>
                    )}
                  </div>
                )}
                
                {/* Tab de Comentarios */}
                {activeTab === 'comentarios' && (
                  <div className="comentarios-tab">
                    <h4>Comentarios sobre Conductores</h4>
                    
                    {/* Formulario para añadir comentario */}
                    <div className="nuevo-comentario">
                      <h5>Añadir Nuevo Comentario</h5>
                      <form onSubmit={handleAddComentario}>
                        <textarea
                          value={nuevoComentario}
                          onChange={(e) => setNuevoComentario(e.target.value)}
                          placeholder="Escriba su comentario sobre un conductor..."
                          required
                        ></textarea>
                        <button type="submit" className="btn-add-comment">
                          Añadir Comentario
                        </button>
                      </form>
                    </div>
                    
                    {/* Lista de comentarios */}
                    {comentariosConductores.length > 0 ? (
                      <ul className="comentarios-list">
                        {comentariosConductores.map((comentario) => (
                          <li key={comentario.id} className="comentario-item">
                            <div className="comentario-header">
                              <strong>{comentario.conductor || 'Conductor'}</strong>
                              <span className="comentario-fecha">{comentario.fecha}</span>
                            </div>
                            <div className="comentario-mensaje">
                              {comentario.mensaje}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No hay comentarios registrados para este cliente.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionClientes;