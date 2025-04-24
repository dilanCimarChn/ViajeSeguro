import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import './gestion-usuarios.css';

const GestionUsuarios = () => {
  // Estados
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'receptionist',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: '' });
  
  const auth = getAuth();

  // Obtener usuarios en tiempo real desde Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      setUsuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Manejo de inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear usuario en Authentication y Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      mostrarNotificacion('Por favor, complete todos los campos', 'warning');
      return;
    }
    
    if (formData.password.length < 6) {
      mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      await addDoc(collection(db, 'usuarios'), {
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        uid: userCredential.user.uid,
        active: true,
        fechaCreacion: new Date().toISOString()
      });

      setFormData({ email: '', password: '', role: 'receptionist' });
      mostrarNotificacion('Usuario creado correctamente', 'success');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      let mensajeError = 'Error al crear usuario';
      
      // Proporcionar mensajes de error más específicos
      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'Este correo electrónico ya está en uso';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El formato del correo electrónico no es válido';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es demasiado débil';
      }
      
      mostrarNotificacion(mensajeError, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      mostrarNotificacion('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      // Buscar usuario en Firestore
      if (!selectedUser) {
        throw new Error('Usuario no seleccionado');
      }

      // Cerrar sesión del usuario actual antes de cambiar la contraseña
      await signOut(auth);

      // Volver a autenticar con las credenciales del usuario que va a cambiar la contraseña
      const userCredential = await signInWithEmailAndPassword(auth, selectedUser.email, selectedUser.password);
      const user = userCredential.user;

      // Actualizar la contraseña en Firebase Authentication
      await updatePassword(user, newPassword);

      // Actualizar la nueva contraseña en Firestore
      await updateDoc(doc(db, 'usuarios', selectedUser.id), { password: newPassword });

      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      
      mostrarNotificacion(`Contraseña actualizada correctamente`, 'success');
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
      mostrarNotificacion('Error al actualizar la contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Habilitar / Deshabilitar usuario
  const toggleAccountStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), { 
        active: !currentStatus,
        fechaActualizacion: new Date().toISOString()
      });

      const mensaje = !currentStatus ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente';
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
      mostrarNotificacion('Error al actualizar estado del usuario', 'error');
    }
  };

  // Abrir modal de cambio de contraseña
  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  // Filtrar usuarios por búsqueda
  const filteredUsuarios = usuarios.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Traducir rol para mostrar
  const traducirRol = (rol) => {
    switch(rol) {
      case 'admin': return 'Administrador';
      case 'receptionist': return 'Recepcionista';
      default: return rol;
    }
  };

  return (
    <div className="gestion-usuarios-container">
      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Usuarios</h2>
        <div className="green-underline"></div>
      </div>
      
      {/* Sección de formulario */}
      <div className="usuarios-section">
        <div className="form-card">
          <h3>Registrar Nuevo Usuario</h3>
          
          <form onSubmit={handleSubmit} className="usuario-form">
            <div className="form-grid">
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
                <label htmlFor="password">Contraseña</label>
                <input 
                  type="password" 
                  id="password"
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Tipo de Usuario</label>
                <select 
                  id="role"
                  name="role" 
                  value={formData.role} 
                  onChange={handleInputChange}
                >
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Nuevo Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Sección de lista de usuarios */}
      <div className="usuarios-section">
        <h3>Usuarios Registrados en el Sistema</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por correo o tipo de usuario"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Cargando usuarios...</p>
          </div>
        )}
        
        {!loading && filteredUsuarios.length === 0 && (
          <div className="no-results">
            <i className="fa fa-exclamation-circle"></i>
            <p>No hay usuarios que coincidan con la búsqueda.</p>
          </div>
        )}
        
                        {!loading && filteredUsuarios.length > 0 && (
          <div className="table-container">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Correo Electrónico</th>
                  <th>Tipo de Usuario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map(user => (
                  <tr key={user.id} className={user.active ? 'row-active' : 'row-inactive'}>
                    <td data-label="Correo Electrónico">{user.email}</td>
                    <td data-label="Tipo de Usuario">{traducirRol(user.role)}</td>
                    <td data-label="Estado">
                      <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="action-buttons">
                        <button 
                          onClick={() => openPasswordModal(user)} 
                          className="btn-table-action btn-password"
                        >
                          <i className="fa fa-key"></i>
                          <span>Cambiar Contraseña</span>
                        </button>
                        <button 
                          onClick={() => toggleAccountStatus(user.id, user.active)} 
                          className={`btn-table-action ${user.active ? 'btn-deactivate' : 'btn-activate'}`}
                        >
                          <i className={user.active ? "fa fa-toggle-on" : "fa fa-toggle-off"}></i>
                          <span>{user.active ? 'Desactivar' : 'Activar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Modal para cambiar contraseña */}
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Cambiar Contraseña</h3>
                <button 
                  className="close-button" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <p className="modal-info">
                  Cambiando contraseña para: <strong>{selectedUser?.email}</strong>
                </p>
                
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label htmlFor="newPassword">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      id="newPassword"
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      required 
                      autoFocus
                    />
                    <p className="input-help">La contraseña debe tener al menos 6 caracteres</p>
                  </div>
                  
                  <div className="modal-footer">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-cancel">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-save" disabled={loading}>
                      {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                    </button>
                  </div>
                </form>
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
    </div>
  );
};

export default GestionUsuarios;