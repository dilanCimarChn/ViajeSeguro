import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './reg-login.css';

function RegLogin({ setUserRole }) { // 👈 Recibe setUserRole desde App.jsx
  const navigate = useNavigate();
  const auth = getAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Evita intentos de login mientras Firebase carga

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

  // ✅ Validar usuario en Firestore antes de redirigir
  const validarSesion = async (user) => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log('Datos en Firestore:', userData);

        if (userData.active) {
          localStorage.setItem('userRole', userData.role);
          setUserRole(userData.role); // 👈 Actualiza el estado global
          navigate('/gestion-usuarios');
        } else {
          console.error("Cuenta deshabilitada.");
          setError("Tu cuenta está deshabilitada. Contacta al administrador.");
          await signOut(auth);
        }
      }
    } catch (error) {
      console.error("Error validando sesión:", error);
      setError("Error validando sesión.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Iniciar sesión manualmente
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
      setError(error.message.includes('deshabilitada') ? 'Tu cuenta está deshabilitada. Contacta al administrador.' : 'Credenciales incorrectas');
      console.error("Error en login:", error);
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
