import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import L from 'leaflet';
import { db } from '../../utils/firebase';
import 'leaflet/dist/leaflet.css';
import './viajes-tiempo-real.css';

// Icono personalizado para los marcadores
const iconoVehiculo = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const VistaViajesTiempoReal = () => {
  // Estados para datos
  const [viajes, setViajes] = useState([]);
  const [posiciones, setPosiciones] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroConductor, setFiltroConductor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creandoDatos, setCreandoDatos] = useState(false);
  
  // Memoizar posición del centro del mapa
  const centroMapa = useMemo(() => [-16.505, -68.130], []);
  
  // Función para formatear fecha - memoizada
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return 'Sin fecha';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return 'Fecha inválida';
    }
  }, []);

  // Función para crear datos de prueba
  const crearDatosPrueba = useCallback(async () => {
    try {
      setCreandoDatos(true);
      
      // Crear conductores
      const dilanRef = await addDoc(collection(db, 'conductores'), {
        nombre: "Dilan Cimar",
        email: "flaquito@gmail.com",
        estado: "activo",
        telefono: "123654",
        fecha_registro: Timestamp.now(),
        fecha_solicitud: Timestamp.now(),
        licenciaURL: "BaseLic",
        viajes_completados: 0
      });
      
      const anaRef = await addDoc(collection(db, 'conductores'), {
        nombre: "Ana Martínez",
        email: "ana@example.com",
        estado: "activo",
        telefono: "987654",
        fecha_registro: Timestamp.now(),
        fecha_solicitud: Timestamp.now(),
        licenciaURL: "BaseLic",
        viajes_completados: 2
      });
      
      const carlosRef = await addDoc(collection(db, 'conductores'), {
        nombre: "Carlos López",
        email: "carlos@example.com",
        estado: "activo",
        telefono: "456789",
        fecha_registro: Timestamp.now(),
        fecha_solicitud: Timestamp.now(),
        licenciaURL: "BaseLic",
        viajes_completados: 5
      });
      
      // Crear viajes
      await addDoc(collection(db, 'viajes'), {
        conductor_id: dilanRef.id,
        destino: "Centro Comercial",
        origen: "Zona Sur",
        estado: "pendiente",
        fecha_inicio: Timestamp.now(),
        fecha_actualizacion: Timestamp.now(),
        tiempo_estimado: 15,
        pasajero: "Juan Pérez",
        tarifa: 25
      });
      
      await addDoc(collection(db, 'viajes'), {
        conductor_id: anaRef.id,
        destino: "Aeropuerto",
        origen: "Centro",
        estado: "en_curso",
        fecha_inicio: Timestamp.now(),
        fecha_actualizacion: Timestamp.now(),
        tiempo_estimado: 30,
        pasajero: "María González",
        tarifa: 40
      });
      
      await addDoc(collection(db, 'viajes'), {
        conductor_id: carlosRef.id,
        destino: "Universidad",
        origen: "Norte",
        estado: "completado",
        fecha_inicio: Timestamp.fromDate(new Date(Date.now() - 24*60*60*1000)),
        fecha_actualizacion: Timestamp.now(),
        tiempo_estimado: 0,
        pasajero: "Roberto Méndez",
        tarifa: 18
      });
      
      // Crear posiciones
      await addDoc(collection(db, 'posiciones_conductores'), {
        conductor_id: dilanRef.id,
        lat: -16.505,
        lng: -68.130,
        velocidad: 30,
        disponible: true,
        timestamp: Timestamp.now()
      });
      
      await addDoc(collection(db, 'posiciones_conductores'), {
        conductor_id: anaRef.id,
        lat: -16.510,
        lng: -68.125,
        velocidad: 0,
        disponible: true,
        timestamp: Timestamp.now()
      });
      
      await addDoc(collection(db, 'posiciones_conductores'), {
        conductor_id: carlosRef.id,
        lat: -16.500,
        lng: -68.140,
        velocidad: 45,
        disponible: false,
        timestamp: Timestamp.now()
      });
      
      alert("Datos de prueba creados exitosamente");
    } catch (error) {
      console.error("Error al crear datos de prueba:", error);
      alert("Error al crear datos de prueba: " + error.message);
    } finally {
      setCreandoDatos(false);
    }
  }, []);
  
  // Cargar conductores - solo una vez al montar
  useEffect(() => {
    let isMounted = true;
    
    // Reemplazar la función cargarConductores en el primer useEffect
    const cargarConductores = async () => {
      try {
        console.log('🔄 Cargando conductores...');
        
        // Primero intentar cargar desde usuario-app
        const usuariosQuery = query(
          collection(db, 'usuario-app'),
          where('rol', '==', 'conductor')
        );
        
        const usuariosSnapshot = await getDocs(usuariosQuery);
        
        if (isMounted) {
          const conductoresData = [];
          
          usuariosSnapshot.forEach(doc => {
            const data = doc.data();
            conductoresData.push({
              id: doc.id,
              nombre: data.name || data.nombre || 'Sin nombre',
              telefono: data.telefono || '',
              email: data.email || '',
              estado: data.estado_disponibilidad || 'inactivo'
            });
          });
          
          console.log('✅ Conductores desde usuario-app:', conductoresData);
          
          // Si no hay conductores en usuario-app, intentar desde conductores
          if (conductoresData.length === 0) {
            console.log('🔄 Intentando cargar desde colección conductores...');
            
            const conductoresQuery = query(
              collection(db, 'conductores'),
              where('estado', '==', 'activo'),
              orderBy('nombre')
            );
            
            const conductoresSnapshot = await getDocs(conductoresQuery);
            
            conductoresSnapshot.forEach(doc => {
              const data = doc.data();
              conductoresData.push({
                id: doc.id,
                nombre: data.nombre || 'Sin nombre',
                telefono: data.telefono || '',
                email: data.email || '',
                estado: data.estado || 'activo'
              });
            });
            
            console.log('✅ Conductores desde conductores:', conductoresData);
          }
          
          // Si aún no hay conductores, agregar tu conductor específico
          if (conductoresData.length === 0) {
            console.log('⚠️ No se encontraron conductores, agregando conductor por defecto');
            conductoresData.push({
              id: 'TxMEX6ifhGjQAQfWLmsY',
              nombre: 'Anders Guitars',
              telefono: '',
              email: 'bolchiquel1@gmail.com',
              estado: 'activo'
            });
          }
          
          setConductores(conductoresData);
        }
      } catch (error) {
        console.error("Error al cargar conductores:", error);
        
        if (isMounted) {
          // Incluir tu conductor específico en los datos de ejemplo
          setConductores([
            { 
              id: 'TxMEX6ifhGjQAQfWLmsY', 
              nombre: 'Anders Guitars', 
              telefono: '', 
              email: 'bolchiquel1@gmail.com',
              estado: 'activo'
            },
            { id: 'C2', nombre: 'Ana Martínez', telefono: '987654', email: 'ana@example.com', estado: 'activo' },
            { id: 'C3', nombre: 'Carlos López', telefono: '456789', email: 'carlos@example.com', estado: 'activo' }
          ]);
        }
      }
    };
    
    
    cargarConductores();
    
    return () => {
      isMounted = false;
    };
  }, []); // Solo se ejecuta una vez
  
  // Cargar viajes - se ejecuta cuando cambian los filtros o conductores
  useEffect(() => {
    if (conductores.length === 0) {
      return; // No hacer nada hasta que se carguen los conductores
    }

    let unsubscribe;
    
    const cargarViajes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Construir consulta
        const constraints = [orderBy('fecha_inicio', 'desc')];
        
        // Aplicar filtro de estado si no es 'todos'
        if (filtroEstado !== 'todos') {
          constraints.unshift(where('estado', '==', filtroEstado));
        }
        
        // Aplicar filtro de conductor si está seleccionado
        if (filtroConductor) {
          constraints.unshift(where('conductor_id', '==', filtroConductor));
        }
        
        const viajesQuery = query(collection(db, 'viajes'), ...constraints);
        
        // Suscripción en tiempo real a viajes
        unsubscribe = onSnapshot(viajesQuery, (querySnapshot) => {
          const viajesData = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Encontrar nombre del conductor
            const conductor = conductores.find(c => c.id === data.conductor_id);
            
            viajesData.push({
              id: doc.id,
              conductor: conductor ? conductor.nombre : 'Conductor desconocido',
              conductorId: data.conductor_id || '',
              destino: data.destino || 'Sin destino',
              origen: data.origen || 'Sin origen',
              estado: data.estado || 'pendiente',
              fecha: formatDate(data.fecha_inicio),
              tiempoEstimado: data.tiempo_estimado || 0,
              pasajero: data.pasajero || 'Sin pasajero',
              tarifa: data.tarifa || 0
            });
          });
          
          setViajes(viajesData);
          setLoading(false);
        }, (error) => {
          console.error("Error al cargar viajes:", error);
          setError("Error al cargar viajes: " + error.message);
          setLoading(false);
          
          // Datos de prueba en caso de error
          setViajes([
            { id: '1', conductor: 'Dilan Cimar', conductorId: 'C1', destino: 'Centro Comercial', origen: 'Zona Sur', estado: 'en_curso', fecha: '09/04/2025 15:30', tiempoEstimado: 15, pasajero: 'Juan Pérez', tarifa: 25 },
            { id: '2', conductor: 'Ana Martínez', conductorId: 'C2', destino: 'Aeropuerto', origen: 'Centro', estado: 'pendiente', fecha: '09/04/2025 16:00', tiempoEstimado: 30, pasajero: 'María González', tarifa: 40 },
            { id: '3', conductor: 'Carlos López', conductorId: 'C3', destino: 'Universidad', origen: 'Norte', estado: 'completado', fecha: '09/04/2025 14:20', tiempoEstimado: 0, pasajero: 'Roberto Méndez', tarifa: 18 }
          ]);
        });
        
      } catch (error) {
        console.error("Error al configurar la consulta de viajes:", error);
        setError("Error al configurar la consulta: " + error.message);
        setLoading(false);
      }
    };
    
    cargarViajes();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [filtroEstado, filtroConductor, conductores, formatDate]);
  
  // Cargar posiciones - depende solo de conductores
  useEffect(() => {
    if (conductores.length === 0) {
      return;
    }

    let unsubscribe;
    
    const cargarPosiciones = async () => {
      try {
        const posicionesQuery = query(
          collection(db, 'posiciones_conductores'),
          orderBy('timestamp', 'desc')
        );
        
        unsubscribe = onSnapshot(posicionesQuery, (querySnapshot) => {
          console.log('📍 Posiciones recibidas:', querySnapshot.size, 'documentos');
          
          const posicionesData = [];
          const conductoresIds = new Set();
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📍 Datos de posición:', data);
            
            const conductorId = data.conductor_id;
            
            // Solo tomar la posición más reciente de cada conductor
            if (!conductoresIds.has(conductorId)) {
              conductoresIds.add(conductorId);
              
              // Buscar en colección usuario-app también
              let conductor = conductores.find(c => c.id === conductorId);
              
              // Si no se encuentra, usar los datos del documento de posición
              if (!conductor) {
                conductor = {
                  id: conductorId,
                  nombre: data.conductor_nombre || `Conductor ${conductorId.substr(0, 6)}`,
                  telefono: '',
                  email: ''
                };
              }
              
              posicionesData.push({
                id: doc.id,
                lat: data.lat || data.latitud || -16.505,
                lng: data.lng || data.longitud || -68.130,
                conductorId: conductorId,
                conductor: conductor.nombre,
                velocidad: Math.round(data.velocidad || data.speed || 0),
                timestamp: data.timestamp,
                disponible: data.disponible !== false, // Por defecto true
                precision: data.precision || data.accuracy || 0
              });
            }
          });
          
          console.log('📍 Posiciones procesadas:', posicionesData);
          setPosiciones(posicionesData);
        }, (error) => {
          console.error("Error al cargar posiciones:", error);
          
          // Datos de ejemplo específicos para tu conductor
          setPosiciones([
            { 
              id: '1', 
              lat: -16.505, 
              lng: -68.130, 
              conductorId: 'TxMEX6ifhGjQAQfWLmsY', 
              conductor: 'Anders Guitars', 
              velocidad: 0, 
              disponible: true,
              precision: 10
            }
          ]);
        });
        
      } catch (error) {
        console.error("Error al configurar la consulta de posiciones:", error);
        
        // Datos de ejemplo en caso de error
        setPosiciones([
          { 
            id: '1', 
            lat: -16.505, 
            lng: -68.130, 
            conductorId: 'TxMEX6ifhGjQAQfWLmsY', 
            conductor: 'Anders Guitars', 
            velocidad: 0, 
            disponible: true 
          }
        ]);
      }
    };
    
    cargarPosiciones();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conductores]);
  
  // Cargar estadísticas - solo una vez y luego cada 10 minutos
  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        // Obtener datos para los últimos 7 días
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        
        const timestampInicio = Timestamp.fromDate(fechaInicio);
        const timestampFin = Timestamp.fromDate(fechaFin);
        
        const viajesQuery = query(
          collection(db, 'viajes'),
          where('fecha_inicio', '>=', timestampInicio),
          where('fecha_inicio', '<=', timestampFin),
          orderBy('fecha_inicio', 'asc')
        );
        
        const viajesSnapshot = await getDocs(viajesQuery);
        
        // Agrupar viajes por fecha
        const viajesPorFecha = {};
        
        viajesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.fecha_inicio) {
            const fecha = data.fecha_inicio.toDate();
            const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!viajesPorFecha[fechaStr]) {
              viajesPorFecha[fechaStr] = 0;
            }
            
            viajesPorFecha[fechaStr]++;
          }
        });
        
        // Formatear para el gráfico
        const estadisticasData = [];
        
        // Asegurarse de tener datos para todos los días
        for (let i = 0; i < 7; i++) {
          const fecha = new Date(fechaInicio);
          fecha.setDate(fechaInicio.getDate() + i);
          const fechaStr = fecha.toISOString().split('T')[0];
          
          estadisticasData.push({
            fecha: fechaStr,
            viajes: viajesPorFecha[fechaStr] || 0
          });
        }
        
        setEstadisticas(estadisticasData);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        
        // Datos de ejemplo en caso de error
        const hoy = new Date();
        const estadisticasData = [];
        
        for (let i = 6; i >= 0; i--) {
          const fecha = new Date(hoy);
          fecha.setDate(hoy.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          
          estadisticasData.push({
            fecha: fechaStr,
            viajes: Math.floor(Math.random() * 20) + 5
          });
        }
        
        setEstadisticas(estadisticasData);
      }
    };
    
    cargarEstadisticas();
    
    // Actualizar estadísticas cada 10 minutos
    const intervalId = setInterval(cargarEstadisticas, 600000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Memoizar viajes filtrados
  const viajesFiltrados = useMemo(() => {
    return viajes.filter(viaje => {
      if (filtroEstado !== 'todos' && viaje.estado !== filtroEstado) {
        return false;
      }
      
      if (filtroConductor && viaje.conductorId !== filtroConductor) {
        return false;
      }
      
      return true;
    });
  }, [viajes, filtroEstado, filtroConductor]);
  
  // Cambiar estado de un viaje
  const cambiarEstadoViaje = useCallback(async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'viajes', id), {
        estado: nuevoEstado,
        fecha_actualizacion: Timestamp.now()
      });
    } catch (error) {
      console.error("Error al actualizar estado del viaje:", error);
      setError("Error al actualizar el viaje: " + error.message);
    }
  }, []);
  
  // Simular un nuevo viaje para pruebas
  const agregarNuevoViaje = useCallback(async () => {
    if (conductores.length === 0) {
      alert("No hay conductores disponibles");
      return;
    }

    setLoading(true);
    
    try {
      // Seleccionar conductor aleatorio
      const conductorIndex = Math.floor(Math.random() * conductores.length);
      const conductor = conductores[conductorIndex];
      
      const destinos = ['Centro Comercial', 'Aeropuerto', 'Universidad', 'Hospital', 'Parque Central'];
      const origenes = ['Zona Sur', 'Zona Norte', 'Centro', 'Zona Este', 'Zona Oeste'];
      
      const destinoIndex = Math.floor(Math.random() * destinos.length);
      const origenIndex = Math.floor(Math.random() * origenes.length);
      
      const nuevoViaje = {
        conductor_id: conductor.id,
        destino: destinos[destinoIndex],
        origen: origenes[origenIndex],
        estado: 'pendiente',
        fecha_inicio: Timestamp.now(),
        fecha_actualizacion: Timestamp.now(),
        tiempo_estimado: Math.floor(Math.random() * 30) + 5,
        pasajero: 'Usuario de prueba',
        tarifa: Math.floor(Math.random() * 50) + 10
      };
      
      await addDoc(collection(db, 'viajes'), nuevoViaje);
      
    } catch (error) {
      console.error("Error al crear nuevo viaje:", error);
      setError("Error al crear nuevo viaje: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [conductores]);

  // Estadísticas memoizadas
  const estadisticasResumen = useMemo(() => {
    return {
      viajesActivos: viajes.filter(v => v.estado === 'en_curso').length,
      viajesPendientes: viajes.filter(v => v.estado === 'pendiente').length,
      viajesHoy: viajes.length,
      conductoresOnline: posiciones.filter(p => p.disponible).length
    };
  }, [viajes, posiciones]);
  
  return (
    <div className="viajes-container">
      <h2>Monitoreo de Viajes en Tiempo Real</h2>
      
      {/* Panel de control */}
      <div className="panel-control">
        <div className="filtros">
          <span>Filtrar por estado: </span>
          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="select-filtro"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En Curso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          
          <span>Conductor: </span>
          <select 
            value={filtroConductor} 
            onChange={(e) => setFiltroConductor(e.target.value)}
            className="select-filtro"
          >
            <option value="">Todos</option>
            {conductores.map(conductor => (
              <option key={conductor.id} value={conductor.id}>
                {conductor.nombre}
              </option>
            ))}
          </select>
        </div>
        
        <div className="acciones">
          <button 
            onClick={agregarNuevoViaje} 
            className="btn-nuevo-viaje"
            disabled={loading || conductores.length === 0}
          >
            Simular Nuevo Viaje
          </button>
          <button 
            onClick={crearDatosPrueba} 
            className="btn-datos-prueba"
            disabled={creandoDatos}
          >
            {creandoDatos ? 'Creando...' : 'Crear Datos de Prueba'}
          </button>
        </div>
      </div>
      
      {/* Mapa de posiciones */}
      <div className="map-section">
        <h3>Ubicación de Conductores</h3>
        <MapContainer 
          center={centroMapa} 
          zoom={13} 
          className="map"
          key="mapa-conductores" // Key estática para evitar re-renders
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          // Reemplazar la sección de marcadores en el MapContainer
          {posiciones.map((pos) => (
            <Marker 
              key={pos.id} 
              position={[pos.lat, pos.lng]} 
              icon={iconoVehiculo}
            >
              <Popup>
                <div className="popup-info">
                  <strong>{pos.conductor}</strong><br />
                  <small>ID: {pos.conductorId.substr(0, 8)}...</small><br />
                  Velocidad: {pos.velocidad} km/h<br />
                  Estado: {pos.disponible ? '🟢 Disponible' : '🔴 Ocupado'}<br />
                  {pos.velocidad > 0 ? '🚗 En movimiento' : '⏸️ Detenido'}<br />
                  {pos.precision && (
                    <>Precisión: {Math.round(pos.precision)}m<br /></>
                  )}
                  {pos.timestamp && (
                    <small>
                      Última actualización: {formatDate(pos.timestamp)}
                    </small>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Lista de viajes */}
      <div className="viajes-list-section">
        <h3>Viajes Activos</h3>
        {loading && <div className="loading-message">Cargando viajes...</div>}
        {error && <div className="error-message">{error}</div>}
        
        <ul className="viajes-list">
          {viajesFiltrados.length > 0 ? (
            viajesFiltrados.map((viaje) => (
              <li key={viaje.id} className={`viaje-card ${viaje.estado}`}>
                <div className="viaje-header">
                  <span className="viaje-id">#{viaje.id.substr(0, 6)}</span>
                  <span className={`viaje-estado ${viaje.estado}`}>
                    {viaje.estado.replace('_', ' ')}
                  </span>
                </div>
                <div className="viaje-body">
                  <p><strong>Conductor:</strong> {viaje.conductor}</p>
                  <p><strong>Origen:</strong> {viaje.origen}</p>
                  <p><strong>Destino:</strong> {viaje.destino}</p>
                  <p><strong>Pasajero:</strong> {viaje.pasajero}</p>
                  <p><strong>Fecha:</strong> {viaje.fecha}</p>
                  {viaje.tiempoEstimado > 0 && viaje.estado !== 'completado' && (
                    <p><strong>Tiempo est.:</strong> {viaje.tiempoEstimado} min</p>
                  )}
                  <p><strong>Tarifa:</strong> ${viaje.tarifa}</p>
                </div>
                <div className="viaje-actions">
                  {viaje.estado === 'pendiente' && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'en_curso')}
                      className="btn-action iniciar"
                    >
                      Iniciar
                    </button>
                  )}
                  {viaje.estado === 'en_curso' && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'completado')}
                      className="btn-action completar"
                    >
                      Completar
                    </button>
                  )}
                  {(viaje.estado === 'pendiente' || viaje.estado === 'en_curso') && (
                    <button 
                      onClick={() => cambiarEstadoViaje(viaje.id, 'cancelado')}
                      className="btn-action cancelar"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="sin-viajes">No hay viajes que coincidan con los filtros</li>
          )}
        </ul>
      </div>
      
      {/* Gráfico de estadísticas */}
      <div className="grafico-viajes">
        <h3>Historial de Viajes (Últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={estadisticas}>
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="viajes" 
              stroke="#007BFF" 
              strokeWidth={2} 
              dot={{ r: 4 }}
              activeDot={{ r: 6, stroke: '#004a99', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen estadístico */}
      <div className="resumen-estadistico">
        <div className="stat-card">
          <div className="stat-title">Viajes Activos</div>
          <div className="stat-value">{estadisticasResumen.viajesActivos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Viajes Pendientes</div>
          <div className="stat-value">{estadisticasResumen.viajesPendientes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Viajes Hoy</div>
          <div className="stat-value">{estadisticasResumen.viajesHoy}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Conductores Online</div>
          <div className="stat-value">{estadisticasResumen.conductoresOnline}</div>
        </div>
      </div>
    </div>
  );
};

export default VistaViajesTiempoReal;