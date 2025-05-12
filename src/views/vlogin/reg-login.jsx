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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuario detectado en sesión:", user.email);

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
          
          if (userData.role === 'admin') {
            navigate('/gestion-usuarios');
          } else if (userData.role === 'receptionist') {
            navigate('/gestion-clientes');
          } else {
            navigate('/gestion-usuarios');
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

      const emailTrimmed = email.trim();
      if (!emailTrimmed || !emailTrimmed.includes('@')) {
        setError('Por favor, ingresa un correo electrónico válido');
        setLoginLoading(false);
        return;
      }

      if (!password || password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoginLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      console.log('Usuario autenticado:', user.email);
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
        <img src="https://i.ibb.co/xtN8mjLv/logo.png" alt="Logo" className="login-image" />
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