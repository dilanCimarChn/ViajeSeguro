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

  const storage = getStorage();

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
      // Si hay un error en la conexión con Firebase, podemos mostrar datos de prueba
      // para desarrollo o una alerta según el entorno
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

  // Manejador para el archivo de licencia
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Crear o actualizar conductor
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.telefono || !formData.licencia) {
      alert('Los campos Nombre, Email, Teléfono y Licencia son obligatorios.');
      return;
    }

    if (!editMode && !file) {
      alert('La foto de la licencia es requerida para nuevos conductores.');
      return;
    }

    setLoading(true);
    
    try {
      let licenciaURL = formData.licenciaURL || '';
      
      // Si hay un nuevo archivo, subir a Storage
      if (file) {
        const storageRef = ref(storage, `licencias/${file.name}`);
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
        alert('Conductor actualizado correctamente.');
      } else {
        // Verificar si el email ya existe
        const emailQuery = query(collection(db, 'conductores'), where('email', '==', formData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          alert('Ya existe un conductor con este correo electrónico.');
          setLoading(false);
          return;
        }
        
        // Crear nuevo conductor
        await addDoc(collection(db, 'conductores'), {
          ...formData,
          licenciaURL,
          fechaRegistro: new Date().toISOString()
        });
        
        alert('Conductor agregado correctamente.');
      }
      
      // Resetear el formulario
      resetForm();
    } catch (error) {
      console.error('Error al procesar conductor:', error);
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
      licencia: '',
      licenciaURL: '',
      activo: true,
      fechaRegistro: new Date().toISOString()
    });
    setFile(null);
    setEditMode(false);
    setCurrentConductorId(null);
    
    // Desplazamiento al inicio del formulario para mejor experiencia de usuario
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      
      alert(`Conductor ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar estado del conductor.');
    }
  };

  // Eliminar conductor
  const deleteConductor = async (conductorId) => {
    if (window.confirm('¿Está seguro que desea eliminar este conductor? Esta acción no se puede deshacer.')) {
      try {
        // Verificar si tiene viajes asociados (en caso de que exista esa relación)
        try {
          const viajesQuery = query(collection(db, 'viajes'), where('conductorId', '==', conductorId));
          const viajesSnapshot = await getDocs(viajesQuery);
          
          if (!viajesSnapshot.empty) {
            if (!window.confirm('Este conductor tiene viajes asociados. ¿Desea eliminarlo de todas formas?')) {
              return false;
            }
            
            // Eliminar todos los viajes asociados
            for (const docItem of viajesSnapshot.docs) {
              await deleteDoc(docItem.ref);
            }
          }
        } catch (error) {
          console.error("Error al verificar viajes:", error);
          // Continuar con la eliminación del conductor
        }
        
        // Eliminar comentarios asociados (si existen)
        try {
          const comentariosQuery = query(collection(db, 'comentarios'), where('conductorId', '==', conductorId));
          const comentariosSnapshot = await getDocs(comentariosQuery);
          
          for (const docItem of comentariosSnapshot.docs) {
            await deleteDoc(docItem.ref);
          }
        } catch (error) {
          console.error("Error al eliminar comentarios:", error);
          // Continuar con la eliminación del conductor
        }
        
        // Finalmente eliminar el conductor
        await deleteDoc(doc(db, 'conductores', conductorId));
        
        // Si estábamos viendo el perfil del conductor eliminado, cerrar el modal
        if (selectedConductor && selectedConductor.id === conductorId) {
          setShowPerfilModal(false);
          setSelectedConductor(null);
        }
        
        alert('Conductor eliminado correctamente.');
        return true;
      } catch (error) {
        console.error('Error al eliminar conductor:', error);
        alert('Error al eliminar conductor.');
        return false;
      }
    }
    return false;
  };

  // Cargar conductor para editar
  const loadConductorForEdit = async (conductorId) => {
    try {
      const conductorDoc = await getDoc(doc(db, 'conductores', conductorId));
      
      if (conductorDoc.exists()) {
        setFormData(conductorDoc.data());
        setEditMode(true);
        setCurrentConductorId(conductorId);
        
        // Si el modal del perfil estaba abierto, lo cerramos
        if (showPerfilModal) {
          setShowPerfilModal(false);
        }
        
        // Nos aseguramos de que el usuario vea el formulario (scroll hacia arriba)
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('El conductor no existe.');
      }
    } catch (error) {
      console.error('Error al cargar conductor:', error);
      alert('Error al cargar datos del conductor.');
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
        alert('El conductor no existe en la base de datos.');
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
        // Usar datos de demostración solo si realmente no hay viajes
        if (historialViajes.length === 0) {
          setHistorialViajes([]);
        }
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
        // Usar datos de demostración solo si realmente no hay comentarios
        if (comentariosClientes.length === 0) {
          setComentariosClientes([]);
        }
      }
      
      // Mostrar modal
      setShowPerfilModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      alert('Error al cargar perfil del conductor.');
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
      
      alert('Cambios de disponibilidad guardados correctamente');
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      alert('Error al guardar horarios.');
    }
  };

  // Eliminar comentario
  const deleteComentario = async (comentarioId) => {
    if (window.confirm('¿Está seguro de eliminar este comentario?')) {
      try {
        // Eliminar de Firebase si existe
        try {
          await deleteDoc(doc(db, 'comentarios', comentarioId));
        } catch (error) {
          console.error('Error al eliminar comentario de Firebase:', error);
        }
        
        // Actualizar la UI
        setComentariosClientes(
          comentariosClientes.filter(c => c.id !== comentarioId)
        );
        
        alert('Comentario eliminado');
      } catch (error) {
        console.error('Error al eliminar comentario:', error);
        alert('Error al eliminar el comentario.');
      }
    }
  };

  return (
    <div className="gestion-conductores">
      <h2>{editMode ? 'Editar Conductor' : 'Agregar Nuevo Conductor'}</h2>
      
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
            <label htmlFor="licencia">Número de Licencia</label>
            <input 
              type="text" 
              id="licencia"
              name="licencia" 
              placeholder="Número de Licencia" 
              value={formData.licencia} 
              onChange={handleInputChange} 
              required 
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group file-upload">
            <label htmlFor="file">Foto de Licencia</label>
            <input 
              type="file" 
              id="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              required={!editMode && !formData.licenciaURL} 
            />
            {editMode && formData.licenciaURL && (
              <p className="file-notice">Ya hay una imagen cargada. Seleccione otra solo si desea cambiarla.</p>
            )}
          </div>
          
          <div className="form-group checkbox-container">
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
        
        <div className="form-buttons">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Procesando...' : (editMode ? 'Actualizar Conductor' : 'Agregar Conductor')}
          </button>
          
          {editMode && (
            <button type="button" onClick={resetForm} className="btn-cancel">
              Cancelar
            </button>
          )}
        </div>
      </form>
      
      <div className="search-container">
        <h3>Conductores Registrados</h3>
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono o licencia"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      {loading && <p className="loading-message">Cargando conductores...</p>}
      
      {!loading && filteredConductores.length === 0 && (
        <p className="no-results">No hay conductores que coincidan con la búsqueda.</p>
      )}
      
      {!loading && filteredConductores.length > 0 && (
        <>
          {/* Vista de escritorio: Tabla */}
          <div className="tabla-container desktop-view">
            <table className="tabla-conductores">
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
                    <tr className={conductor.activo ? 'conductor-activo' : 'conductor-inactivo'}>
                      <td>{conductor.nombre}</td>
                      <td>{conductor.email}</td>
                      <td>{conductor.telefono}</td>
                      <td>{conductor.licencia}</td>
                      <td>
                        <span className={`status-badge ${conductor.activo ? 'active' : 'inactive'}`}>
                          {conductor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          onClick={() => toggleDetails(conductor.id)} 
                          className="btn-details"
                          aria-label="Ver detalles"
                          title="Ver detalles"
                        >
                          <i className="fa fa-info-circle"></i>
                        </button>
                        <button 
                          onClick={() => loadConductorForEdit(conductor.id)} 
                          className="btn-edit"
                          aria-label="Editar conductor"
                          title="Editar conductor"
                        >
                          <i className="fa fa-pencil"></i>
                        </button>
                        <button 
                          onClick={() => toggleAccountStatus(conductor.id, conductor.activo)} 
                          className={conductor.activo ? 'btn-deactivate' : 'btn-activate'}
                          aria-label={conductor.activo ? 'Desactivar conductor' : 'Activar conductor'}
                          title={conductor.activo ? 'Desactivar conductor' : 'Activar conductor'}
                        >
                          <i className={conductor.activo ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                        </button>
                        <button 
                          onClick={() => deleteConductor(conductor.id)} 
                          className="btn-delete"
                          aria-label="Eliminar conductor"
                          title="Eliminar conductor"
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                        <button 
                          onClick={() => verPerfil(conductor.id)} 
                          className="btn-perfil"
                          aria-label="Ver perfil completo"
                          title="Ver perfil completo"
                        >
                          <i className="fa fa-user"></i>
                        </button>
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
                className={`conductor-card ${conductor.activo ? 'card-activo' : 'card-inactivo'}`}
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
                    <div className="card-details">
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
                    className="btn-details"
                  >
                    {showDetails[conductor.id] ? 'Ocultar' : 'Detalles'}
                  </button>
                  <button 
                    onClick={() => loadConductorForEdit(conductor.id)} 
                    className="btn-edit"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => toggleAccountStatus(conductor.id, conductor.activo)} 
                    className={conductor.activo ? 'btn-deactivate' : 'btn-activate'}
                  >
                    {conductor.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button 
                    onClick={() => deleteConductor(conductor.id)} 
                    className="btn-delete"
                  >
                    Eliminar
                  </button>
                  <button 
                    onClick={() => verPerfil(conductor.id)} 
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
      
      {/* Modal para Perfil de Conductor */}
      {showPerfilModal && selectedConductor && (
        <div className="perfil-modal">
          <div className="perfil-modal-content">
            <div className="perfil-modal-header">
              <h3>Perfil del Conductor</h3>
              <button 
                className="close-btn" 
                onClick={closePerfilModal}
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
                  className={`tab-btn ${activeTab === 'horarios' ? 'active' : ''}`}
                  onClick={() => setActiveTab('horarios')}
                >
                  Disponibilidad
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
                {/* Tab de información */}
                {activeTab === 'info' && (
                  <div className="info-tab">
                    <div className="info-card profile-header">
                      {selectedConductor.licenciaURL && (
                        <img 
                          src={selectedConductor.licenciaURL} 
                          alt="Licencia de conducir" 
                          className="profile-img"
                        />
                      )}
                      <div className="profile-data">
                        <h4>Datos Personales</h4>
                        <p><strong>Nombre:</strong> {selectedConductor.nombre}</p>
                        <p><strong>Email:</strong> {selectedConductor.email}</p>
                        <p><strong>Teléfono:</strong> {selectedConductor.telefono}</p>
                        <p><strong>Licencia:</strong> {selectedConductor.licencia}</p>
                        <p><strong>Estado:</strong> <span className={selectedConductor.activo ? "status-active" : "status-inactive"}>
                          {selectedConductor.activo ? 'Activo' : 'Inactivo'}
                        </span></p>
                        <p><strong>Fecha de Registro:</strong> {
                          selectedConductor.fechaRegistro ? 
                            formatDate(selectedConductor.fechaRegistro) : 
                            'Fecha desconocida'
                        }</p>
                        {selectedConductor.fechaActualizacion && (
                          <p><strong>Última Actualización:</strong> {
                            formatDate(selectedConductor.fechaActualizacion)
                          }</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="actions-card">
                      <h4>Acciones Rápidas</h4>
                      <div className="action-buttons">
                        <button 
                          onClick={() => {
                            loadConductorForEdit(selectedConductor.id);
                            closePerfilModal();
                          }} 
                          className="btn-edit"
                        >
                          Editar Información
                        </button>
                        <button 
                          onClick={() => {
                            toggleAccountStatus(selectedConductor.id, selectedConductor.activo);
                          }} 
                          className={selectedConductor.activo ? 'btn-deactivate' : 'btn-activate'}
                        >
                          {selectedConductor.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                        </button>
                        <button 
                          onClick={() => {
                            if (deleteConductor(selectedConductor.id)) {
                              closePerfilModal();
                            }
                          }} 
                          className="btn-delete"
                        >
                          Eliminar Conductor
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tab de Horarios Disponibles */}
                {activeTab === 'horarios' && (
                  <div className="horarios-tab">
                    <h4>Disponibilidad</h4>
                    <div className="horarios-container">
                      <ul className="horarios-list">
                        {horariosDisponibles.map((horario) => (
                          <li key={horario.dia} className={horario.disponible ? "horario-disponible" : "horario-no-disponible"}>
                            <span className="dia">{horario.dia}</span>
                            <span className="estado-disponibilidad">
                              {horario.disponible ? 'Disponible' : 'No Disponible'}
                            </span>
                            <button 
                              className="toggle-day-btn" 
                              onClick={() => toggleDayAvailability(horario.dia)}
                              title={`Cambiar disponibilidad de ${horario.dia}`}
                            >
                              <i className="fa fa-refresh"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="disponibilidad-info">
                      <h4>Información Adicional</h4>
                      <p>Este conductor trabaja principalmente en turno {selectedConductor.nombre.length % 2 === 0 ? 'diurno' : 'nocturno'}.</p>
                      <p>Áreas de servicio: Centro de la ciudad, Zona Norte, Aeropuerto.</p>
                    </div>
                    
                    <div className="horarios-actions">
                      <button
                        className="btn-edit"
                        onClick={saveHorarios}
                      >
                        Guardar Cambios
                      </button>
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
                            {viaje.clienteNombre && (
                              <div className="viaje-cliente">
                                <strong>Cliente:</strong> {viaje.clienteNombre}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No hay viajes registrados para este conductor.</p>
                    )}
                  </div>
                )}
                
                {/* Tab de Comentarios */}
                {activeTab === 'comentarios' && (
                  <div className="comentarios-tab">
                    <h4>Comentarios de Clientes</h4>
                    
                    {/* Lista de comentarios */}
                    {comentariosClientes.length > 0 ? (
                      <ul className="comentarios-list">
                        {comentariosClientes.map((comentario) => (
                          <li key={comentario.id} className="comentario-item">
                            <div className="comentario-header">
                              <strong>{comentario.cliente || 'Cliente'}</strong>
                              <span className="comentario-fecha">{comentario.fecha}</span>
                            </div>
                            <div className="comentario-mensaje">
                              {comentario.mensaje}
                            </div>
                            <div className="comentario-acciones">
                              <button 
                                className="btn-delete-comment"
                                onClick={() => deleteComentario(comentario.id)}
                              >
                                <i className="fa fa-trash"></i> Eliminar
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No hay comentarios registrados para este conductor.</p>
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

export default GestionConductores;