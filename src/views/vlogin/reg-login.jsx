import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './reg-login.css';

function RegLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleIngresarClick = async () => {
    const auth = getAuth();
    try {
      // Intentar iniciar sesión con Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Usuario autenticado:', user);

      // Verificar si el usuario existe en Firestore
      const q = query(collection(db, 'usuarios'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log('Datos en Firestore:', userData);

        // Verificar si el usuario está activo
        if (!userData.active) {
          throw new Error('Tu cuenta está deshabilitada. Contacta al administrador.');
        }

        // Almacenar el rol en localStorage
        localStorage.setItem('userRole', userData.role);

        // Redirigir al usuario a la vista correspondiente
        navigate('/gestion-usuarios');
      } else {
        throw new Error('Usuario no encontrado en Firestore.');
      }
    } catch (error) {
      // Manejar el error de credenciales incorrectas
      setError(
        error.message.includes('deshabilitada')
          ? 'Tu cuenta está deshabilitada. Contacta al administrador.'
          : 'Credenciales incorrectas o cuenta no registrada en Firestore.'
      );
      console.error('Error en login:', error);
    }
  };

  return (
    <div className="reg-login-container">
      <div className="reg-login-box">
        <h2>Iniciar Sesión</h2>
        <p className="reg-login-description">Bienvenido de nuevo, ingresa tus credenciales</p>
        <div className="reg-login-form">
          <label>Email</label>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Contraseña</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <button className="reg-login-button" onClick={handleIngresarClick}>
            Ingresar
          </button>
          {error && <p className="reg-login-error-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default RegLogin;
