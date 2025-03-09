import React, { useState, useEffect } from 'react';
import {collection,addDoc,getDocs,updateDoc,deleteDoc,doc,onSnapshot
} from 'firebase/firestore';
import {getAuth,createUserWithEmailAndPassword,deleteUser,updatePassword,signInWithEmailAndPassword,signOut
} from 'firebase/auth';
import { db } from '../../utils/firebase';
import './gestion-usuarios.css';

const GestionUsuarios = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'receptionist',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  // Obtener usuarios en tiempo real desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      setUsuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  // Manejo de inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear usuario en Authentication y Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
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
      });

      setFormData({ email: '', password: '', role: 'receptionist' });
      alert('Usuario creado correctamente.');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  //  Cambiar contraseña en Firebase Authentication y Firestore correctamente
  const changeUserPassword = async (userId, newPassword) => {
    try {
      // Buscar usuario en Firestore
      const userDoc = usuarios.find(user => user.id === userId);
      if (!userDoc) {
        alert('Usuario no encontrado.');
        return;
      }

      // Cerrar sesión del usuario actual antes de cambiar la contraseña
      await signOut(auth);

      //  Volver a autenticar con las credenciales del usuario que va a cambiar la contraseña
      const userCredential = await signInWithEmailAndPassword(auth, userDoc.email, userDoc.password);
      const user = userCredential.user;

      //  Actualizar la contraseña en Firebase Authentication
      await updatePassword(user, newPassword);

      // Actualizar la nueva contraseña en Firestore
      await updateDoc(doc(db, 'usuarios', userId), { password: newPassword });

      alert(`Contraseña de ${userDoc.email} actualizada correctamente.`);
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
      alert('Error al actualizar la contraseña.');
    }
  };

  //  Habilitar / Deshabilitar usuario
  const toggleAccountStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), { active: !currentStatus });

      alert('Estado del usuario actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
      alert('Error al actualizar estado del usuario.');
    }
  };

  //  Obtener usuario por correo electrónico en Firebase Authentication
  const getUserByEmail = async (email) => {
    try {
      const usersList = await getDocs(collection(db, 'usuarios'));
      const user = usersList.docs.find(doc => doc.data().email === email);
      return user ? user.data().uid : null;
    } catch (error) {
      console.error('Error obteniendo UID de usuario:', error);
      return null;
    }
  };

  //  Eliminar usuario sin afectar al usuario autenticado
  const deleteUserAccount = async (userId) => {
    try {
      const userDoc = usuarios.find(user => user.id === userId);
      if (!userDoc) {
        alert('Usuario no encontrado.');
        return;
      }

      if (auth.currentUser?.uid === userDoc.uid) {
        alert('No puedes eliminar tu propia cuenta mientras estás logueado.');
        return;
      }

      //  Obtener UID del usuario en Authentication
      const userUID = await getUserByEmail(userDoc.email);
      if (!userUID) {
        alert('No se encontró UID del usuario en Authentication.');
        return;
      }

      //  Eliminar usuario de Firebase Authentication
      const userToDelete = await signInWithEmailAndPassword(auth, userDoc.email, userDoc.password);
      await deleteUser(userToDelete.user);

      //  Eliminar usuario de Firestore
      await deleteDoc(doc(db, 'usuarios', userId));

      alert(`Usuario ${userDoc.email} eliminado correctamente.`);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario.');
    }
  };

  return (
    <div className="gestion-usuarios">
      <h2>Gestión de Usuarios</h2>
      <form onSubmit={handleSubmit} className="gestion-form">
        <input type="email" name="email" placeholder="Correo" value={formData.email} onChange={handleInputChange} required />
        <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} required />
        <select name="role" value={formData.role} onChange={handleInputChange}>
          <option value="receptionist">Recepcionista</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Usuario'}
        </button>
      </form>

      <h3>Usuarios Registrados</h3>
      <ul>
        {usuarios.map(user => (
          <li key={user.id}>
            {user.email} - {user.role} - {user.active ? 'Activo' : 'Inactivo'}
            <button onClick={() => toggleAccountStatus(user.id, user.active)}>
              {user.active ? 'Deshabilitar' : 'Habilitar'}
            </button>
            <button onClick={() => deleteUserAccount(user.id)}>Eliminar</button>
            <button onClick={() => {
              const newPassword = prompt(`Ingresa la nueva contraseña para ${user.email}:`);
              if (newPassword) changeUserPassword(user.id, newPassword);
            }}>
              Cambiar Contraseña
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GestionUsuarios;