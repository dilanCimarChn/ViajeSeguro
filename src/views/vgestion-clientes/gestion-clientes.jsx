import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './gestion-clientes.css';

const GestionClientes = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    activo: true,
  });

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.email || !formData.telefono || !formData.direccion) {
      alert('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'clientes'), formData);
      setFormData({ nombre: '', email: '', telefono: '', direccion: '', activo: true });
      alert('Cliente agregado correctamente.');
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      alert('Error al agregar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountStatus = async (clienteId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'clientes', clienteId), { activo: !currentStatus });
      alert('Estado del cliente actualizado.');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar estado.');
    }
  };

  const deleteCliente = async (clienteId) => {
    try {
      await deleteDoc(doc(db, 'clientes', clienteId));
      alert('Cliente eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error al eliminar cliente.');
    }
  };

  return (
    <div className="gestion-clientes">
      <h2>Gestión de Clientes</h2>
      <form onSubmit={handleSubmit} className="gestion-form">
        <input type="text" name="nombre" placeholder="Nombre Completo" value={formData.nombre} onChange={handleInputChange} required />
        <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleInputChange} required />
        <input type="text" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleInputChange} required />
        <input type="text" name="direccion" placeholder="Dirección" value={formData.direccion} onChange={handleInputChange} required />
        <button type="submit" disabled={loading}>{loading ? 'Agregando...' : 'Agregar Cliente'}</button>
      </form>

      <h3>Clientes Registrados</h3>
      {clientes.length > 0 ? (
        <ul>
          {clientes.map(cliente => (
            <li key={cliente.id}>
              {cliente.nombre} - {cliente.email} - {cliente.telefono} - {cliente.direccion} - {cliente.activo ? 'Activo' : 'Inactivo'}
              <button onClick={() => toggleAccountStatus(cliente.id, cliente.activo)}>
                {cliente.activo ? 'Deshabilitar' : 'Habilitar'}
              </button>
              <button onClick={() => deleteCliente(cliente.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay clientes registrados.</p>
      )}
    </div>
  );
};

export default GestionClientes;
