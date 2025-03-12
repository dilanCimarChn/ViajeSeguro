import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../utils/firebase';
import './gestion-conductores.css';

const GestionConductores = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    licencia: '',
    licenciaURL: '',
    activo: true,
  });
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const storage = getStorage();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'conductores'), (snapshot) => {
      setConductores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.email || !formData.telefono || !formData.licencia || !file) {
      alert('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      let licenciaURL = '';
      if (file) {
        const storageRef = ref(storage, `licencias/${file.name}`);
        await uploadBytes(storageRef, file);
        licenciaURL = await getDownloadURL(storageRef);
      }

      const newConductor = { ...formData, licenciaURL };
      await addDoc(collection(db, 'conductores'), newConductor);

      setFormData({ nombre: '', email: '', telefono: '', licencia: '', licenciaURL: '', activo: true });
      setFile(null);
      alert('Conductor agregado correctamente.');
    } catch (error) {
      console.error('Error al agregar conductor:', error);
      alert('Error al agregar conductor.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountStatus = async (conductorId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'conductores', conductorId), { activo: !currentStatus });
      alert('Estado del conductor actualizado.');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar estado.');
    }
  };

  const deleteConductor = async (conductorId) => {
    try {
      await deleteDoc(doc(db, 'conductores', conductorId));
      alert('Conductor eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar conductor:', error);
      alert('Error al eliminar conductor.');
    }
  };

  return (
    <div className="gestion-conductores">
      <h2>Gestión de Conductores</h2>
      <form onSubmit={handleSubmit} className="gestion-form">
        <input type="text" name="nombre" placeholder="Nombre Completo" value={formData.nombre} onChange={handleInputChange} required />
        <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleInputChange} required />
        <input type="text" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleInputChange} required />
        <input type="text" name="licencia" placeholder="Número de Licencia" value={formData.licencia} onChange={handleInputChange} required />
        <div className="file-upload">
          <label htmlFor="file">Añadir foto de licencia:</label>
          <input type="file" id="file" accept="image/*" onChange={handleFileChange} required />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Agregando...' : 'Agregar Conductor'}</button>
      </form>

      <h3>Conductores Registrados</h3>
      {conductores.length > 0 ? (
        <ul>
          {conductores.map(conductor => (
            <li key={conductor.id}>
              {conductor.nombre} - {conductor.email} - {conductor.telefono} - {conductor.licencia} - {conductor.activo ? 'Activo' : 'Inactivo'}
              {conductor.licenciaURL && <img src={conductor.licenciaURL} alt="Licencia" className="img-licencia" />}
              <button onClick={() => toggleAccountStatus(conductor.id, conductor.activo)}>
                {conductor.activo ? 'Deshabilitar' : 'Habilitar'}
              </button>
              <button onClick={() => deleteConductor(conductor.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay conductores registrados.</p>
      )}
    </div>
  );
};

export default GestionConductores;
