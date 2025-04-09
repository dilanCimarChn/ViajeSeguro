import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { query, where, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { registrarLog } from '../../utils/logUtils'; // Importamos la función de registro de logs
import './reg-login.css';

function RegLogin({ setUserRole }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuario detectado en sesión:", user.email);
        await validarSesion(user);
      } else {
        console.log("No hay usuario autenticado.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
          // Registrar el inicio de sesión exitoso
          await registrarLog(
            userDoc.id, // ID del documento en Firestore
            user.email,
            'inicio_sesion',
            'Inicio de sesión exitoso',
            'autenticacion',
            'exitoso'
          );
          
          localStorage.setItem('userRole', userData.role);
          setUserRole(userData.role);
          navigate('/gestion-usuarios');
        } else {
          console.error("Cuenta deshabilitada.");
          setError("Tu cuenta está deshabilitada. Contacta al administrador.");
          
          // Registrar intento con cuenta deshabilitada
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
      }
    } catch (error) {
      console.error("Error validando sesión:", error);
      setError("Error validando sesión.");
      
      // Registrar error de validación
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
      setLoading(false);
    }
  };

  // Iniciar sesión manualmente
  const handleIngresarClick = async () => {
    try {
      if (loading) return;
      setError('');
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      console.log('Usuario autenticado:', user.email);
      await validarSesion(user);
    } catch (error) {
      console.error("Error en login:", error);
      
      // Registrar intento fallido de inicio de sesión
      await registrarLog(
        'sistema', // No hay ID de usuario porque falló la autenticación
        email.trim(),
        'intento_login',
        `Credenciales incorrectas: ${error.message}`,
        'autenticacion',
        'fallido'
      );
      
      setError(error.message.includes('deshabilitada') 
        ? 'Tu cuenta está deshabilitada. Contacta al administrador.' 
        : 'Credenciales incorrectas');
      setLoading(false);
    }
  };

  return (
    <div className="reg-login-container">
      <div className="reg-login-box">
        <h2>Iniciar Sesión prueba cono las credenciales user = ded@gmail.com  password = admin44</h2>
        <p className="reg-login-description">Bienvenido de nuevo, ingresa tus credenciales</p>
        <div className="reg-login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label htmlFor="password">Contraseña</label>
          <div className="password-container">
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button className="reg-login-button" onClick={handleIngresarClick} disabled={loading}>
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
          {error && <p className="reg-login-error-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default RegLogin;