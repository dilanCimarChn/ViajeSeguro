import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../utils/firebase';
import './gestion-conductores.css';

const GestionConductores = () => {
  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    licencia: '',
    licenciaURL: '',
    activo: true,
    fechaRegistro: new Date().toISOString()
  });

  // Estados para gestionar conductores
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentConductorId, setCurrentConductorId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState({});
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });

  // Estados para el perfil de conductor
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [historialViajes, setHistorialViajes] = useState([]);
  const [comentariosClientes, setComentariosClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [horariosDisponibles, setHorariosDisponibles] = useState([
    { dia: 'Lunes', disponible: true },
    { dia: 'Martes', disponible: false },
    { dia: 'Miércoles', disponible: true },
    { dia: 'Jueves', disponible: true },
    { dia: 'Viernes', disponible: true },
    { dia: 'Sábado', disponible: false },
    { dia: 'Domingo', disponible: false },
  ]);
  
  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [conductorEdit, setConductorEdit] = useState(null);

  const storage = getStorage();
  
  // Sistema de notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({
      visible: true,
      mensaje,
      tipo
    });
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Obtener conductores de Firebase
  useEffect(() => {
    setLoading(true);
    try {
      const unsubscribe = onSnapshot(collection(db, 'conductores'), (snapshot) => {
        const conductoresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConductores(conductoresData);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Error al obtener conductores:", error);
      setLoading(false);
      mostrarNotificacion('Error al cargar conductores', 'error');
    }
  }, []);

  // Manejador de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };
  
  // Manejador de cambios en el formulario de edición modal
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConductorEdit(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Manejador para el archivo de licencia
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  // Manejador para el archivo de licencia en modal de edición
  const handleEditFileChange = (e) => {
    if (e.target.files[0]) {
      setConductorEdit(prev => ({
        ...prev,
        newFile: e.target.files[0]
      }));
    }
  };

  // Crear o actualizar conductor
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.telefono || !formData.licencia) {
      mostrarNotificacion('Los campos Nombre, Email, Teléfono y Licencia son obligatorios', 'warning');
      return;
    }

    if (!editMode && !file) {
      mostrarNotificacion('La foto de la licencia es requerida para nuevos conductores', 'warning');
      return;
    }

    setLoading(true);
    
    try {
      let licenciaURL = formData.licenciaURL || '';
      
      // Si hay un nuevo archivo, subir a Storage
      if (file) {
        const storageRef = ref(storage, `licencias/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        licenciaURL = await getDownloadURL(storageRef);
      }

      if (editMode && currentConductorId) {
        // Actualizar conductor existente
        await updateDoc(doc(db, 'conductores', currentConductorId), {
          ...formData,
          licenciaURL,
          fechaActualizacion: new Date().toISOString()
        });
        mostrarNotificacion('Conductor actualizado correctamente', 'success');
      } else {
        // Verificar si el email ya existe
        const emailQuery = query(collection(db, 'conductores'), where('email', '==', formData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          mostrarNotificacion('Ya existe un conductor con este correo electrónico', 'warning');
          setLoading(false);
          return;
        }
        
        // Crear nuevo conductor
        await addDoc(collection(db, 'conductores'), {
          ...formData,
          licenciaURL,
          fechaRegistro: new Date().toISOString()
        });
        
        mostrarNotificacion('Conductor agregado correctamente', 'success');
      }
      
      // Resetear el formulario
      resetForm();
    } catch (error) {
      console.error('Error al procesar conductor:', error);
      mostrarNotificacion(`Error: ${error.message}`, 'error');
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
      licencia: '',
      licenciaURL: '',
      activo: true,
      fechaRegistro: new Date().toISOString()
    });
    setFile(null);
    setEditMode(false);
    setCurrentConductorId(null);
  };

  // Cambiar estado de activación del conductor
  const toggleAccountStatus = async (conductorId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'conductores', conductorId), { 
        activo: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Si estamos viendo el perfil del conductor, actualizamos el estado local
      if (selectedConductor && selectedConductor.id === conductorId) {
        setSelectedConductor({
          ...selectedConductor,
          activo: !currentStatus,
          fechaActualizacion: new Date().toISOString()
        });
      }
      
      const mensaje = !currentStatus ? 'Conductor activado correctamente' : 'Conductor desactivado correctamente';
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      mostrarNotificacion('Error al actualizar estado del conductor', 'error');
    }
  };

  // Abrir modal de edición
  const openEditModal = async (conductorId) => {
    try {
      const conductorDoc = await getDoc(doc(db, 'conductores', conductorId));
      
      if (conductorDoc.exists()) {
        setConductorEdit({
          id: conductorId,
          ...conductorDoc.data(),
          newFile: null
        });
        setShowEditModal(true);
        
        // Si el modal del perfil estaba abierto, lo cerramos
        if (showPerfilModal) {
          setShowPerfilModal(false);
        }
      } else {
        mostrarNotificacion('El conductor no existe', 'error');
      }
    } catch (error) {
      console.error('Error al cargar conductor:', error);
      mostrarNotificacion('Error al cargar datos del conductor', 'error');
    }
  };
  
  // Guardar edición del conductor
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!conductorEdit.nombre || !conductorEdit.email || !conductorEdit.telefono || !conductorEdit.licencia) {
      mostrarNotificacion('Los campos Nombre, Email, Teléfono y Licencia son obligatorios', 'warning');
      return;
    }

    setLoading(true);
    
    try {
      let licenciaURL = conductorEdit.licenciaURL || '';
      
      // Si hay un nuevo archivo, subir a Storage
      if (conductorEdit.newFile) {
        const storageRef = ref(storage, `licencias/${Date.now()}_${conductorEdit.newFile.name}`);
        await uploadBytes(storageRef, conductorEdit.newFile);
        licenciaURL = await getDownloadURL(storageRef);
      }

      // Actualizar conductor en Firebase
      await updateDoc(doc(db, 'conductores', conductorEdit.id), {
        nombre: conductorEdit.nombre,
        email: conductorEdit.email,
        telefono: conductorEdit.telefono,
        licencia: conductorEdit.licencia,
        licenciaURL,
        activo: conductorEdit.activo,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Cerrar modal y mostrar notificación
      setShowEditModal(false);
      setConductorEdit(null);
      mostrarNotificacion('Conductor actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar conductor:', error);
      mostrarNotificacion(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle para mostrar detalles
  const toggleDetails = (conductorId) => {
    setShowDetails(prev => ({
      ...prev,
      [conductorId]: !prev[conductorId]
    }));
  };

  // Ver perfil de conductor
  const verPerfil = async (conductorId) => {
    try {
      setLoading(true);
      
      // Obtener datos del conductor
      const conductorDoc = await getDoc(doc(db, 'conductores', conductorId));
      
      if (!conductorDoc.exists()) {
        mostrarNotificacion('El conductor no existe en la base de datos', 'error');
        setLoading(false);
        return;
      }
      
      const conductorData = { id: conductorDoc.id, ...conductorDoc.data() };
      setSelectedConductor(conductorData);
      
      // Cargar horarios (si existen en el documento del conductor)
      if (conductorData.horarios && Array.isArray(conductorData.horarios)) {
        setHorariosDisponibles(conductorData.horarios);
      }
      
      // Cargar historial de viajes
      try {
        const viajesQuery = query(
          collection(db, 'viajes'),
          where('conductorId', '==', conductorId),
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
      } catch (error) {
        console.error('Error al cargar viajes:', error);
        setHistorialViajes([]);
      }
      
      // Cargar comentarios de clientes
      try {
        const comentariosQuery = query(
          collection(db, 'comentarios'),
          where('conductorId', '==', conductorId),
          orderBy('fecha', 'desc')
        );
        
        const comentariosSnapshot = await getDocs(comentariosQuery);
        const comentariosData = comentariosSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          fecha: doc.data().fecha ? formatDate(doc.data().fecha) : 'Fecha desconocida'
        }));
        
        setComentariosClientes(comentariosData);
      } catch (error) {
        console.error('Error al cargar comentarios:', error);
        setComentariosClientes([]);
      }
      
      // Mostrar modal
      setShowPerfilModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      mostrarNotificacion('Error al cargar perfil del conductor', 'error');
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return 'Fecha inválida';
    }
  };

  // Filtrar conductores por término de búsqueda
  const filteredConductores = conductores.filter(conductor => 
    (conductor.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conductor.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conductor.telefono || '').includes(searchTerm) ||
    (conductor.licencia?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Cerrar modal de perfil
  const closePerfilModal = () => {
    setShowPerfilModal(false);
    setSelectedConductor(null);
    setActiveTab('info');
  };
  
  // Función para actualizar el estado de disponibilidad por día
  const toggleDayAvailability = (day) => {
    const updatedHorarios = horariosDisponibles.map(horario => 
      horario.dia === day ? { ...horario, disponible: !horario.disponible } : horario
    );
    setHorariosDisponibles(updatedHorarios);
  };
  
  // Guardar cambios de horarios en Firebase
  const saveHorarios = async () => {
    if (!selectedConductor) return;
    
    try {
      await updateDoc(doc(db, 'conductores', selectedConductor.id), { 
        horarios: horariosDisponibles,
        fechaActualizacion: new Date().toISOString()
      });
      
      // Actualizar el conductor seleccionado con los nuevos horarios
      setSelectedConductor({
        ...selectedConductor,
        horarios: horariosDisponibles,
        fechaActualizacion: new Date().toISOString()
      });
      
      mostrarNotificacion('Cambios de disponibilidad guardados correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      mostrarNotificacion('Error al guardar horarios', 'error');
    }
  };

  return (
    <div className="gestion-conductores-container">
      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Conductores</h2>
        <div className="green-underline"></div>
      </div>
      
      {/* Sección de formulario */}
      <div className="conductor-section">
        <h3>Agregar Nuevo Conductor</h3>
        
        <form onSubmit={handleSubmit} className="conductor-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <input 
                type="text" 
                id="nombre"
                name="nombre" 
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
                value={formData.email} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="telefono">Teléfono</label>
              <input 
                type="tel" 
                id="telefono"
                name="telefono" 
                value={formData.telefono} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="licencia">Número de Licencia</label>
              <input 
                type="text" 
                id="licencia"
                name="licencia" 
                value={formData.licencia} 
                onChange={handleInputChange} 
                required 
              />
            </div>
          </div>
          
          <div className="form-file-group">
            <label htmlFor="file">Foto de Licencia</label>
            <div className="file-input-container">
              <input 
                type="file" 
                id="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                required={!editMode && !formData.licenciaURL} 
                className="file-input"
              />
              <div className="file-input-label">
                <i className="fa fa-upload"></i>
                <span>{file ? file.name : 'Seleccionar archivo'}</span>
              </div>
            </div>
            <div className="form-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  name="activo" 
                  checked={formData.activo} 
                  onChange={handleInputChange} 
                />
                Conductor Activo
              </label>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : 'Registrar Conductor'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Sección de lista de conductores */}
      <div className="conductor-section">
        <h3>Conductores Registrados en el Sistema</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o licencia"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Cargando conductores...</p>
          </div>
        )}
        
        {!loading && filteredConductores.length === 0 && (
          <div className="no-results">
            <i className="fa fa-exclamation-circle"></i>
            <p>No hay conductores que coincidan con la búsqueda.</p>
          </div>
        )}
        
        {!loading && filteredConductores.length > 0 && (
          <>
            {/* Vista de escritorio: Tabla */}
            <div className="table-container desktop-view">
              <table className="conductores-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Licencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductores.map(conductor => (
                    <React.Fragment key={conductor.id}>
                      <tr className={conductor.activo ? 'row-active' : 'row-inactive'}>
                        <td data-label="Nombre">{conductor.nombre}</td>
                        <td data-label="Email">{conductor.email}</td>
                        <td data-label="Teléfono">{conductor.telefono}</td>
                        <td data-label="Licencia">{conductor.licencia}</td>
                        <td data-label="Estado">
                          <span className={`status-badge ${conductor.activo ? 'active' : 'inactive'}`}>
                            {conductor.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <div className="action-buttons">
                            <button 
                              onClick={() => toggleDetails(conductor.id)} 
                              className="btn-table-action btn-details"
                            >
                              <i className="fa fa-info-circle"></i>
                              <span>Detalles</span>
                            </button>
                            <button 
                              onClick={() => openEditModal(conductor.id)} 
                              className="btn-table-action btn-edit"
                            >
                              <i className="fa fa-pencil"></i>
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={() => toggleAccountStatus(conductor.id, conductor.activo)} 
                              className={`btn-table-action ${conductor.activo ? 'btn-deactivate' : 'btn-activate'}`}
                            >
                              <i className={conductor.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                              <span>{conductor.activo ? 'Desactivar' : 'Activar'}</span>
                            </button>
                            <button 
                              onClick={() => verPerfil(conductor.id)} 
                              className="btn-table-action btn-profile"
                            >
                              <i className="fa fa-user"></i>
                              <span>Perfil</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandible con detalles */}
                      {showDetails[conductor.id] && (
                        <tr className="details-row">
                          <td colSpan="6">
                            <div className="conductor-details">
                              {conductor.licenciaURL && (
                                <div className="license-img-container">
                                  <img 
                                    src={conductor.licenciaURL} 
                                    alt="Licencia de conducir" 
                                    className="license-img" 
                                  />
                                </div>
                              )}
                              <div className="conductor-details-text">
                                <p><strong>Fecha de Registro:</strong> {
                                  conductor.fechaRegistro ? 
                                    formatDate(conductor.fechaRegistro) : 
                                    'Fecha desconocida'
                                }</p>
                                {conductor.fechaActualizacion && (
                                  <p><strong>Última Actualización:</strong> {
                                    formatDate(conductor.fechaActualizacion)
                                  }</p>
                                )}
                              </div>
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
              {filteredConductores.map(conductor => (
                <div 
                  key={conductor.id} 
                  className={`conductor-card ${conductor.activo ? 'card-active' : 'card-inactive'}`}
                >
                  <div className="card-header">
                    <h4>{conductor.nombre}</h4>
                    <span className={`status-badge ${conductor.activo ? 'active' : 'inactive'}`}>
                      {conductor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <p><i className="fa fa-envelope"></i> {conductor.email}</p>
                    <p><i className="fa fa-phone"></i> {conductor.telefono}</p>
                    <p><i className="fa fa-id-card"></i> {conductor.licencia}</p>
                    
                    {showDetails[conductor.id] && (
                      <div className="card-expanded">
                        {conductor.licenciaURL && (
                          <div className="license-img-container">
                            <img 
                              src={conductor.licenciaURL} 
                              alt="Licencia de conducir" 
                              className="license-img" 
                            />
                          </div>
                        )}
                        <p><i className="fa fa-calendar"></i> Registro: {
                          conductor.fechaRegistro ? 
                            formatDate(conductor.fechaRegistro) : 
                            'Fecha desconocida'
                        }</p>
                        {conductor.fechaActualizacion && (
                          <p><i className="fa fa-refresh"></i> Actualización: {
                            formatDate(conductor.fechaActualizacion)
                          }</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      onClick={() => toggleDetails(conductor.id)} 
                      className="btn-card-action"
                    >
                      {showDetails[conductor.id] ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                    
                    <div className="card-buttons">
                      <button 
                        onClick={() => openEditModal(conductor.id)} 
                        className="btn-card-action btn-edit"
                      >
                        <i className="fa fa-pencil"></i>
                        Editar Conductor
                      </button>
                      <button 
                        onClick={() => toggleAccountStatus(conductor.id, conductor.activo)} 
                        className={`btn-card-action ${conductor.activo ? 'btn-deactivate' : 'btn-activate'}`}
                      >
                        <i className={conductor.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        {conductor.activo ? 'Desactivar Conductor' : 'Activar Conductor'}
                      </button>
                      <button 
                        onClick={() => verPerfil(conductor.id)} 
                        className="btn-card-action btn-profile"
                      >
                        <i className="fa fa-user"></i>
                        Ver Perfil Completo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Modal de edición de conductor */}
      {showEditModal && conductorEdit && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Editar Conductor</h3>
              <button 
                className="close-button" 
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSaveEdit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edit-nombre">Nombre Completo</label>
                    <input 
                      type="text" 
                      id="edit-nombre"
                      name="nombre" 
                      value={conductorEdit.telefono || ''} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-licencia">Número de Licencia</label>
                    <input 
                      type="text" 
                      id="edit-licencia"
                      name="licencia" 
                      value={conductorEdit.licencia || ''} 
                      onChange={handleEditChange} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-file-group">
                  <label htmlFor="edit-file">Foto de Licencia</label>
                  <div className="file-input-container">
                    <input 
                      type="file" 
                      id="edit-file" 
                      accept="image/*" 
                      onChange={handleEditFileChange}
                      className="file-input"
                    />
                    <div className="file-input-label">
                      <i className="fa fa-upload"></i>
                      <span>{conductorEdit.newFile ? conductorEdit.newFile.name : 'Seleccionar nuevo archivo'}</span>
                    </div>
                  </div>
                  {conductorEdit.licenciaURL && (
                    <div className="current-image-container">
                      <p className="current-image-label">Imagen actual:</p>
                      <img 
                        src={conductorEdit.licenciaURL} 
                        alt="Licencia actual" 
                        className="current-image-preview" 
                      />
                    </div>
                  )}
                  <div className="form-checkbox">
                    <label>
                      <input 
                        type="checkbox" 
                        name="activo" 
                        checked={conductorEdit.activo || false} 
                        onChange={handleEditChange} 
                      />
                      Conductor Activo
                    </label>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-cancel">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para Perfil de Conductor */}
      {showPerfilModal && selectedConductor && (
        <div className="profile-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Perfil del Conductor</h3>
              <button 
                className="close-button" 
                onClick={closePerfilModal}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-tabs">
              <button 
                className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Información
              </button>
              <button 
                className={`tab-button ${activeTab === 'horarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('horarios')}
              >
                Disponibilidad
              </button>
              <button 
                className={`tab-button ${activeTab === 'viajes' ? 'active' : ''}`}
                onClick={() => setActiveTab('viajes')}
              >
                Historial de Viajes
              </button>
              <button 
                className={`tab-button ${activeTab === 'comentarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('comentarios')}
              >
                Comentarios
              </button>
            </div>
            
            <div className="modal-body">
              {/* Tab de Información */}
              {activeTab === 'info' && (
                <div className="info-tab">
                  <div className="info-section profile-section">
                    {selectedConductor.licenciaURL && (
                      <div className="profile-image">
                        <img 
                          src={selectedConductor.licenciaURL} 
                          alt="Licencia de conducir" 
                          className="license-image" 
                        />
                      </div>
                    )}
                    <div className="profile-info">
                      <h4>Datos Personales</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Nombre:</span>
                          <span className="info-value">{selectedConductor.nombre}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email:</span>
                          <span className="info-value">{selectedConductor.email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Teléfono:</span>
                          <span className="info-value">{selectedConductor.telefono}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Licencia:</span>
                          <span className="info-value">{selectedConductor.licencia}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Estado:</span>
                          <span className="info-value">
                            <span className={`status-badge ${selectedConductor.activo ? 'active' : 'inactive'}`}>
                              {selectedConductor.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Fecha de Registro:</span>
                          <span className="info-value">
                            {selectedConductor.fechaRegistro ? 
                              formatDate(selectedConductor.fechaRegistro) : 
                              'Fecha desconocida'}
                          </span>
                        </div>
                        {selectedConductor.fechaActualizacion && (
                          <div className="info-item">
                            <span className="info-label">Última Actualización:</span>
                            <span className="info-value">
                              {formatDate(selectedConductor.fechaActualizacion)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="actions-section">
                    <h4>Acciones Rápidas</h4>
                    <div className="action-buttons">
                      <button 
                        onClick={() => {
                          openEditModal(selectedConductor.id);
                        }} 
                        className="btn-modal-action"
                      >
                        <i className="fa fa-pencil"></i> 
                        Modificar Datos del Conductor
                      </button>
                      <button 
                        onClick={() => {
                          toggleAccountStatus(selectedConductor.id, selectedConductor.activo);
                        }} 
                        className={selectedConductor.activo ? 'btn-modal-deactivate' : 'btn-modal-activate'}
                      >
                        <i className={selectedConductor.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        {selectedConductor.activo ? 'Desactivar Cuenta de Conductor' : 'Activar Cuenta de Conductor'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tab de Horarios Disponibles */}
              {activeTab === 'horarios' && (
                <div className="horarios-tab">
                  <h4>Disponibilidad Semanal</h4>
                  <div className="horarios-container">
                    <div className="horarios-list">
                      {horariosDisponibles.map((horario) => (
                        <div 
                          key={horario.dia} 
                          className={`horario-item ${horario.disponible ? 'disponible' : 'no-disponible'}`}
                        >
                          <div className="horario-info">
                            <span className="horario-dia">{horario.dia}</span>
                            <span className="horario-estado">
                              {horario.disponible ? 'Disponible' : 'No Disponible'}
                            </span>
                          </div>
                          <button 
                            className="btn-toggle-availability" 
                            onClick={() => toggleDayAvailability(horario.dia)}
                            title={`Cambiar disponibilidad de ${horario.dia}`}
                          >
                            <i className="fa fa-refresh"></i>
                            <span>Cambiar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="horarios-actions">
                      <button
                        className="btn-save"
                        onClick={saveHorarios}
                      >
                        <i className="fa fa-save"></i>
                        Guardar Horarios
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
                    <div className="viajes-list">
                      {historialViajes.map((viaje) => (
                        <div key={viaje.id} className="viaje-item">
                          <div className="viaje-header">
                            <div className="viaje-fecha">{viaje.fecha}</div>
                            <div className="viaje-calificacion">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} 
                                  className={i < (viaje.calificacion || 0) ? "star-filled" : "star-empty"}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="viaje-route">
                            <span className="viaje-origen">{viaje.origen || 'Origen no especificado'}</span>
                            <span className="viaje-arrow">→</span>
                            <span className="viaje-destino">{viaje.destino || 'Destino no especificado'}</span>
                          </div>
                          {viaje.clienteNombre && (
                            <div className="viaje-cliente">
                              <i className="fa fa-user-circle"></i>
                              <span>{viaje.clienteNombre}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">
                      <i className="fa fa-car"></i>
                      <p>No hay viajes registrados para este conductor.</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tab de Comentarios */}
              {activeTab === 'comentarios' && (
                <div className="comentarios-tab">
                  <h4>Comentarios de Clientes</h4>
                  
                  {/* Lista de comentarios */}
                  {comentariosClientes.length > 0 ? (
                    <div className="comentarios-list">
                      {comentariosClientes.map((comentario) => (
                        <div key={comentario.id} className="comentario-item">
                          <div className="comentario-header">
                            <div className="comentario-autor">
                              <i className="fa fa-user-circle"></i>
                              <span>{comentario.cliente || 'Cliente'}</span>
                            </div>
                            <div className="comentario-fecha">{comentario.fecha}</div>
                          </div>
                          <div className="comentario-body">
                            {comentario.mensaje}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">
                      <i className="fa fa-comments"></i>
                      <p>No hay comentarios registrados para este conductor.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Sistema de notificaciones */}
      {notificacion.visible && (
        <div className={`notification notification-${notificacion.tipo}`}>
          <span className="notification-message">{notificacion.mensaje}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default GestionConductores;