import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils';
import './reg-login.css';

function RegLogin({ setUserRole }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    // Limpieza previa al montar
    // Si estamos en la página de login, verificamos si hay un usuario activo
    // pero evitamos validar automáticamente la sesión
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuario detectado en sesión:", user.email);
        
        // Si estamos explícitamente en la página de login,
        // no validamos automáticamente - esperamos que el usuario inicie sesión
        const isLoginPage = window.location.pathname === '/login';
        
        if (isLoginPage) {
          console.log("En página de login con sesión activa - esperando acción del usuario");
          setInitialLoading(false);
        } else {
          await validarSesion(user);
        }
      } else {
        console.log("No hay usuario autenticado.");
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Validar usuario en Firestore y registrar sesión
  const validarSesion = async (user) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log('Datos en Firestore:', userData);

        if (userData.active) {
          await registrarLog(
            userDoc.id, 
            user.email,
            'inicio_sesion',
            'Inicio de sesión exitoso',
            'autenticacion',
            'exitoso'
          );

          localStorage.setItem('userRole', userData.role);
          setUserRole(userData.role);
          
          // Navegar según el rol del usuario
          if (userData.role === 'admin') {
            navigate('/gestion-usuarios');
          } else if (userData.role === 'receptionist') {
            navigate('/gestion-clientes');
          } else {
            navigate('/gestion-usuarios'); // Ruta por defecto
          }
        } else {
          console.error("Cuenta deshabilitada.");
          setError("Tu cuenta está deshabilitada. Contacta al administrador.");

          await registrarLog(
            userDoc.id,
            user.email,
            'intento_login',
            'Intento de inicio de sesión con cuenta deshabilitada',
            'autenticacion',
            'fallido'
          );

          await signOut(auth);
        }
      } else {
        // Usuario no encontrado en Firestore
        console.error("Usuario no encontrado en Firestore");
        await signOut(auth);
        setError("Usuario no registrado en el sistema");
      }
    } catch (error) {
      console.error("Error validando sesión:", error);
      setError("Error validando sesión.");
      if (user) {
        await registrarLog(
          user.uid,
          user.email,
          'validar_sesion',
          `Error en validación: ${error.message}`,
          'autenticacion',
          'fallido'
        );
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleIngresarClick = async () => {
    try {
      if (loginLoading || initialLoading) return;
      setError('');
      setLoginLoading(true);

      // Validación básica del email
      const emailTrimmed = email.trim();
      if (!emailTrimmed || !emailTrimmed.includes('@')) {
        setError('Por favor, ingresa un correo electrónico válido');
        setLoginLoading(false);
        return;
      }

      // Validación básica de la contraseña
      if (!password || password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoginLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      console.log('Usuario autenticado:', user.email);
      // Llamamos explícitamente a validarSesion, ya que en la página de login
      // el listener de onAuthStateChanged no lo hace automáticamente
      await validarSesion(user);
    } catch (error) {
      console.error("Error en login:", error);
      await registrarLog(
        'sistema',
        email.trim(),
        'intento_login',
        `Credenciales incorrectas: ${error.message}`,
        'autenticacion',
        'fallido'
      );
      
      // Mensajes de error más descriptivos
      let errorMessage = 'Credenciales incorrectas';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este correo electrónico';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Inténtalo más tarde';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tu cuenta está deshabilitada. Contacta al administrador';
      }
      
      setError(errorMessage);
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar sesión</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={initialLoading}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={initialLoading}
        />
        <button onClick={handleIngresarClick} disabled={loginLoading || initialLoading}>
          {loginLoading ? 'Iniciando sesión...' : initialLoading ? 'Cargando...' : 'Ingresar'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default RegLogin;