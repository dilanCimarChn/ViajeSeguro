import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import GestionAdmTabla from './gestion-adm-tabla';
import './gestion-usuarios.css';

const GestionUsuarios = () => {
  // Estados para manejo de formularios y datos
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    ci: '',
    genero: 'masculino',
    celular: '',
    role: 'receptionist',
  });
  
  // Estados de la aplicación
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modalCambioClave, setModalCambioClave] = useState(false);
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [notificacion, setNotificacion] = useState({ 
    visible: false, 
    mensaje: '', 
    tipo: '' 
  });
  const [nuevoUsuario, setNuevoUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('registro'); // Estado para controlar la vista activa
  
  // Configuraciones de autenticación
  const auth = getAuth();
  const DOMAIN = 'vseguro.com';

  // Efecto para manejar el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar información del usuario en Firestore
        const usuarioRef = query(
          collection(db, 'usuarios'), 
          where('uid', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(usuarioRef);
        
        if (!querySnapshot.empty) {
          const usuarioData = querySnapshot.docs[0].data();
          
          // Verificar si requiere cambio de contraseña
          if (usuarioData.requiereCambioPassword) {
            setModalCambioClave(true);
            setUsuarioActual({
              ...usuarioData,
              docId: querySnapshot.docs[0].id
            });
          } else {
            setUsuarioActual(usuarioData);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Efecto para obtener usuarios
  useEffect(() => {
    const obtenerUsuarios = async () => {
      try {
        // Obtener usuarios en tiempo real desde Firestore
        const usuariosRef = collection(db, 'usuarios');
        const unsubscribe = onSnapshot(usuariosRef, (snapshot) => {
          const usuariosActualizados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsuarios(usuariosActualizados);
        });

        // Retornar función de limpieza
        return () => unsubscribe();
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        mostrarNotificacion('Error al cargar administradores', 'error');
      }
    };

    obtenerUsuarios();
  }, []);

  // Función para mostrar notificaciones
  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({
      visible: true,
      mensaje,
      tipo
    });
    
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Función para manejar cambio de contraseña
  const handleCambioClave = async (e) => {
    e.preventDefault();
    
    // Validaciones de contraseña
    if (nuevaClave !== confirmarClave) {
      mostrarNotificacion('Las contraseñas no coinciden', 'error');
      return;
    }
    
    if (nuevaClave.length < 8) {
      mostrarNotificacion('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }
    
    // Validar complejidad de contraseña
    const regexMayuscula = /[A-Z]/;
    const regexMinuscula = /[a-z]/;
    const regexNumero = /[0-9]/;
    const regexEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    
    if (!regexMayuscula.test(nuevaClave) || 
        !regexMinuscula.test(nuevaClave) || 
        !regexNumero.test(nuevaClave) || 
        !regexEspecial.test(nuevaClave)) {
      mostrarNotificacion('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      // Obtener usuario actual
      const user = auth.currentUser;
      
      // Actualizar contraseña en Firebase Authentication
      await updatePassword(user, nuevaClave);
      
      // Actualizar estado de cambio de contraseña en Firestore
      await updateDoc(doc(db, 'usuarios', usuarioActual.docId), {
        requiereCambioPassword: false,
        fechaCambioClave: new Date().toISOString()
      });
      
      // Resetear estados
      setModalCambioClave(false);
      setNuevaClave('');
      setConfirmarClave('');
      
      mostrarNotificacion('Contraseña cambiada exitosamente', 'success');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      mostrarNotificacion('Error al cambiar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generar correo electrónico basado en nombres
  const generarCorreo = (nombres, apellidoPaterno, apellidoMaterno) => {
    if (!nombres || !apellidoPaterno) return '';
    
    const primeraLetraNombre = nombres.trim().charAt(0).toLowerCase();
    const apellidoPaternoLower = apellidoPaterno.trim().toLowerCase();
    const primeraLetraMaterno = apellidoMaterno ? apellidoMaterno.trim().charAt(0).toLowerCase() : '';
    
    return `${primeraLetraNombre}${apellidoPaternoLower}${primeraLetraMaterno}@${DOMAIN}`;
  };

  // Generar contraseña aleatoria segura
  const generarContraseña = (longitud = 10) => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    const caracteresEspeciales = '!@#$%^&*()_+';
    let contraseña = '';
    
    // Asegurar complejidad de contraseña
    contraseña += caracteres.charAt(Math.floor(Math.random() * 26)); // Mayúscula
    contraseña += caracteres.charAt(26 + Math.floor(Math.random() * 26)); // Minúscula
    contraseña += caracteres.charAt(52 + Math.floor(Math.random() * 10)); // Número
    contraseña += caracteresEspeciales.charAt(Math.floor(Math.random() * caracteresEspeciales.length)); // Carácter especial
    
    // Completar contraseña
    for (let i = 4; i < longitud; i++) {
      contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    // Mezclar caracteres
    return contraseña.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Verificar si el correo ya existe
  const verificarCorreoExistente = async (email) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar correo:', error);
      return true; // Por seguridad, asumimos que existe en caso de error
    }
  };

  // Manejar cambios en inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear nuevo usuario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombres || !formData.apellidoPaterno || !formData.ci || !formData.celular) {
      mostrarNotificacion('Por favor, complete todos los campos obligatorios', 'warning');
      return;
    }
    
    // Validar CI (solo números y mínimo 5 dígitos)
    if (!/^\d{5,10}$/.test(formData.ci)) {
      mostrarNotificacion('El carnet debe contener entre 5 y 10 dígitos', 'warning');
      return;
    }
    
    // Validar celular (solo números y 8 dígitos)
    if (!/^\d{8}$/.test(formData.celular)) {
      mostrarNotificacion('El número de celular debe contener 8 dígitos', 'warning');
      return;
    }
    
    setLoading(true);
    
    try {
      // Generar correo electrónico
      const email = generarCorreo(formData.nombres, formData.apellidoPaterno, formData.apellidoMaterno);
      
      // Verificar si el correo ya existe
      const correoExistente = await verificarCorreoExistente(email);
      if (correoExistente) {
        mostrarNotificacion(`El correo ${email} ya está registrado en el sistema`, 'error');
        setLoading(false);
        return;
      }
      
      // Generar contraseña aleatoria
      const password = generarContraseña();
      
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Datos del usuario para Firestore
      const userData = {
        nombres: formData.nombres.trim(),
        apellidoPaterno: formData.apellidoPaterno.trim(),
        apellidoMaterno: formData.apellidoMaterno?.trim() || '',
        ci: formData.ci.trim(),
        genero: formData.genero,
        celular: formData.celular.trim(),
        email: email,
        role: formData.role,
        uid: userCredential.user.uid,
        active: true,
        requiereCambioPassword: true,
        fechaCreacion: new Date().toISOString()
      };
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'usuarios'), userData);
      
      // Preparar datos para mostrar en el modal
      setNuevoUsuario({ ...userData, password, docId: docRef.id });
      
      // Resetear formulario
      setFormData({
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        ci: '',
        genero: 'masculino',
        celular: '',
        role: 'receptionist',
      });
      
      // Mostrar modal con datos de acceso
      setShowNewUserModal(true);
      
      mostrarNotificacion('Administrador creado correctamente', 'success');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      let mensajeError = 'Error al crear administrador';
      
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

  // Copiar información al portapapeles
  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto)
      .then(() => mostrarNotificacion('Información copiada al portapapeles', 'success'))
      .catch(err => mostrarNotificacion('Error al copiar información', 'error'));
  };

  // Renderizado de modal de cambio de contraseña
  const renderModalCambioClave = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h3>Cambio de Contraseña Obligatorio</h3>
          </div>
          
          <form onSubmit={handleCambioClave} className="modal-body">
            <p>Por seguridad, debe cambiar su contraseña en el primer inicio de sesión.</p>
            
            <div className="form-group">
              <label htmlFor="nuevaClave">Nueva Contraseña</label>
              <input 
                type="password"
                id="nuevaClave"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmarClave">Confirmar Nueva Contraseña</label>
              <input 
                type="password"
                id="confirmarClave"
                value={confirmarClave}
                onChange={(e) => setConfirmarClave(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-info">
              <p><small>La contraseña debe contener:</small></p>
              <ul>
                <li>Mínimo 8 caracteres</li>
                <li>Al menos una mayúscula</li>
                <li>Al menos una minúscula</li>
                <li>Al menos un número</li>
                <li>Al menos un carácter especial</li>
              </ul>
            </div>
            
            <div className="modal-footer">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizado del formulario de registro
  const renderFormularioRegistro = () => {
    return (
      <div className="usuarios-section">
        <div className="form-card">
          <h3>Registrar Nuevo Administrador</h3>
          
          <form onSubmit={handleSubmit} className="usuario-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nombres">Nombres *</label>
                <input 
                  type="text" 
                  id="nombres"
                  name="nombres" 
                  value={formData.nombres} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="apellidoPaterno">Apellido Paterno *</label>
                <input 
                  type="text" 
                  id="apellidoPaterno"
                  name="apellidoPaterno" 
                  value={formData.apellidoPaterno} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="apellidoMaterno">Apellido Materno</label>
                <input 
                  type="text" 
                  id="apellidoMaterno"
                  name="apellidoMaterno" 
                  value={formData.apellidoMaterno} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="ci">Carnet de Identidad *</label>
                <input 
                  type="text" 
                  id="ci"
                  name="ci" 
                  value={formData.ci} 
                  onChange={handleInputChange} 
                  pattern="\d{5,10}"
                  title="El carnet debe contener entre 5 y 10 dígitos"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="genero">Género *</label>
                <select 
                  id="genero"
                  name="genero" 
                  value={formData.genero} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="celular">Celular *</label>
                <input 
                  type="tel" 
                  id="celular"
                  name="celular" 
                  value={formData.celular} 
                  onChange={handleInputChange} 
                  pattern="\d{8}"
                  title="El número de celular debe contener 8 dígitos"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Tipo de Administrador *</label>
                <select 
                  id="role"
                  name="role" 
                  value={formData.role} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="form-info">
              <p><small>* Campos obligatorios</small></p>
              <p><small>El correo electrónico se generará automáticamente usando la primera letra del nombre, el apellido paterno completo y la primera letra del apellido materno.</small></p>
              <p><small>La contraseña se generará automáticamente.</small></p>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Nuevo Administrador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizado de componente principal
  return (
    <div className="gestion-usuarios-container">
      {/* Modal de cambio de contraseña obligatorio */}
      {modalCambioClave && renderModalCambioClave()}

      {/* Encabezado de sección */}
      <div className="section-header">
        <h2>Panel de Gestión de Administradores</h2>
        <div className="green-underline"></div>
      </div>

      {/* Sistema de pestañas */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'registro' ? 'active' : ''}`}
            onClick={() => setActiveTab('registro')}
          >
            <i className="fa fa-plus-circle"></i>
            <span>Registrar Administrador</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
          >
            <i className="fa fa-list"></i>
            <span>Lista de Administradores</span>
          </button>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="tab-content">
        {activeTab === 'registro' && renderFormularioRegistro()}
        
        {activeTab === 'lista' && (
          <GestionAdmTabla 
            usuarios={usuarios}
            loading={loading}
            mostrarNotificacion={mostrarNotificacion}
            generarContraseña={generarContraseña}
            copiarAlPortapapeles={copiarAlPortapapeles}
            setShowNewUserModal={setShowNewUserModal}
            setNuevoUsuario={setNuevoUsuario}
            showNewUserModal={showNewUserModal}
            nuevoUsuario={nuevoUsuario}
          />
        )}
      </div>

      {/* Modal para nuevo usuario */}
      {showNewUserModal && nuevoUsuario && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nuevo Administrador Creado</h3>
              <button 
                className="close-button" 
                onClick={() => setShowNewUserModal(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <h4>Información del Administrador</h4>
              <p><strong>Nombre completo:</strong> {`${nuevoUsuario.nombres} ${nuevoUsuario.apellidoPaterno} ${nuevoUsuario.apellidoMaterno}`}</p>
              <p><strong>Tipo:</strong> {nuevoUsuario.role === 'admin' ? 'Administrador' : 'Recepcionista'}</p>
              
              <div className="credentials-box">
                <h4>Credenciales de Acceso</h4>
                <div className="credential-item">
                  <span><strong>Correo electrónico:</strong> {nuevoUsuario.email}</span>
                </div>
                <div className="credential-item">
                  <span><strong>Contraseña temporal:</strong> {nuevoUsuario.password}</span>
                </div>
              </div>
              
              <div className="warning-box">
                <i className="fa fa-exclamation-triangle"></i>
                <p><strong>ADVERTENCIA:</strong> GUARDE ESTAS CREDENCIALES DE ACCESO. EL USUARIO DEBERÁ CAMBIAR SU CONTRASEÑA EN EL PRIMER INICIO DE SESIÓN.</p>
              </div>
              
              <div className="info-box">
                <i className="fa fa-info-circle"></i>
                <p>Por razones de seguridad, estas credenciales no podrán ser recuperadas una vez que cierre esta ventana.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-copy-all" 
                onClick={() => copiarAlPortapapeles(`Correo: ${nuevoUsuario.email}\nContraseña: ${nuevoUsuario.password}`)}
              >
                <i className="fa fa-copy"></i> Copiar Todas las Credenciales
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowNewUserModal(false)}
              >
                Entendido
              </button>
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

export default GestionUsuarios;