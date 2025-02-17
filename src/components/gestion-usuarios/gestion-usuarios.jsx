import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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

  // Crear usuario en Firebase Authentication y almacenar su rol en Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      setLoading(true);

      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userId = userCredential.user.uid;

      // Guardar rol en Firestore (pero no la contraseña)
      await addDoc(collection(db, 'usuarios'), {
        email: formData.email,
        role: formData.role,
        uid: userId,
        active: true,
      });

      setUsuarios([...usuarios, { email: formData.email, role: formData.role, active: true }]);
      setFormData({ email: '', password: '', role: 'receptionist' });
      alert('Usuario creado exitosamente.');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Hubo un error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  // Habilitar o deshabilitar usuarios
  const toggleAccountStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, { active: !currentStatus });
      setUsuarios(usuarios.map(user => (user.id === userId ? { ...user, active: !currentStatus } : user)));
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
    }
  };

  // Eliminar usuario
  const deleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      setUsuarios(usuarios.filter(user => user.id !== userId));
      alert('Usuario eliminado exitosamente.');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
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
      <ul className="user-list">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="user-item">
            <p>Email: {usuario.email}</p>
            <p>Rol: {usuario.role}</p>
            <p>Estado: {usuario.active ? 'Activo' : 'Inactivo'}</p>
            <button onClick={() => toggleAccountStatus(usuario.id, usuario.active || false)}>
              {usuario.active ? 'Deshabilitar' : 'Habilitar'}
            </button>
            <button onClick={() => deleteUser(usuario.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GestionUsuarios;
