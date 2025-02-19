import React, { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, deleteUser, updatePassword, signOut } from 'firebase/auth';
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

  // Obtener lista de usuarios de Firestore
  useEffect(() => {
    const fetchUsuarios = async () => {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      setUsuarios(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsuarios();
  }, []);

  // Manejar cambios en los inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear usuario en Firebase Authentication y almacenarlo en Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      setLoading(true);

      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Guardar datos en Firestore con el UID correcto
      await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        uid: userCredential.user.uid,
        active: true,
      });

      setUsuarios([...usuarios, { ...formData, uid: userCredential.user.uid, active: true }]);
      setFormData({ email: '', password: '', role: 'receptionist' });
      alert('Usuario creado exitosamente.');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  // Función para habilitar/deshabilitar usuarios
  const toggleAccountStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, { active: !currentStatus });
      setUsuarios(usuarios.map(user => user.id === userId ? { ...user, active: !currentStatus } : user));
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
    }
  };

  // Eliminar usuario de Firestore y Firebase Authentication
  const deleteUserAccount = async (userId) => {
    const auth = getAuth();
    try {
      const userRef = doc(db, 'usuarios', userId);

      // Eliminar usuario de Firebase Authentication
      const user = auth.currentUser;
      if (user) {
        await deleteUser(user);  // This deletes the current user from Firebase Authentication
      }

      // Eliminar usuario de Firestore
      await deleteDoc(userRef);
      setUsuarios(usuarios.filter(user => user.id !== userId));
      alert('Usuario eliminado con éxito.');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Hubo un error al eliminar el usuario.');
    }
  };

  // Cambiar contraseña
  const changePassword = async (userId, newPassword) => {
    try {
      const auth = getAuth();
      const userRef = doc(db, 'usuarios', userId);

      // Actualizar contraseña en Firestore
      await updateDoc(userRef, { password: newPassword });

      // Actualizar lista local
      setUsuarios(usuarios.map(user => user.id === userId ? { ...user, password: newPassword } : user));

      alert('Contraseña actualizada exitosamente.');
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error);
    }
  };

  return (
    <div className="gestion-usuarios">
      <h2>Gestión de Usuarios</h2>
      <form onSubmit={handleSubmit} className="gestion-form">
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleInputChange}
          required
        />
        <select name="role" value={formData.role} onChange={handleInputChange}>
          <option value="receptionist">Recepcionista</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Usuario'}
        </button>
      </form>

      <h3>Usuarios Registrados</h3>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id}>
              <td>{usuario.email}</td>
              <td>{usuario.role}</td>
              <td>{usuario.active ? 'Activo' : 'Deshabilitado'}</td>
              <td>
                <button onClick={() => deleteUserAccount(usuario.id)}>Eliminar</button>
                <button onClick={() => toggleAccountStatus(usuario.id, usuario.active)}>
                  {usuario.active ? 'Deshabilitar' : 'Habilitar'}
                </button>
                <button
                  onClick={() => {
                    const newPassword = prompt('Ingrese la nueva contraseña:');
                    if (newPassword) changePassword(usuario.id, newPassword);
                  }}
                >
                  Cambiar Contraseña
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionUsuarios;
