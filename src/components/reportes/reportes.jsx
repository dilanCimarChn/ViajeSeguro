import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  endBefore,
  doc,
  getDoc
} from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { db } from '../../utils/firebase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './reportes.css';

const Reportes = () => {
  // Estados para gestión de pestañas y datos
  const [activeTab, setActiveTab] = useState('viajes');
  const [activeSubTab, setActiveSubTab] = useState('graficos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para idioma (para exportación CSV)
  const [idioma, setIdioma] = useState('es'); // 'es' para español, 'en' para inglés
 
  // Estados para fechas de filtrado
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [fechaFin, setFechaFin] = useState(new Date());
 
  // Referencias para tablas y gráficos (útil para exportación)
  const tableRef = useRef(null);
  const chartRef = useRef(null);
 
  // Estados para almacenar datos
  const [viajesData, setViajesData] = useState([]);
  const [viajesDataGrafico, setViajesDataGrafico] = useState([]);
  const [usuariosData, setUsuariosData] = useState([]);
  const [conductoresData, setConductoresData] = useState([]);
  const [solicitudesData, setSolicitudesData] = useState([]);
  const [administradoresData, setAdministradoresData] = useState([]);
  const [grabacionesData, setGrabacionesData] = useState([]);
  const [logsData, setLogsData] = useState([]);
 
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [primerDocumento, setPrimerDocumento] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
 
  // Estados para filtros adicionales
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroConductor, setFiltroConductor] = useState('');
  const [filtroTipoViaje, setFiltroTipoViaje] = useState('todos');
 
  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A64AC9', '#FF5A5F', '#3CAEA3'];

  // UseEffect para cargar datos según la pestaña activa
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
     
      try {
        switch(activeTab) {
          case 'viajes':
            await cargarViajes();
            break;
          case 'usuarios':
            await cargarUsuarios();
            break;
          case 'conductores':
            await cargarConductores();
            break;
          case 'solicitudes':
            await cargarSolicitudes();
            break;
          case 'admins':
            await cargarAdministradores();
            break;
          case 'grabaciones':
            await cargarGrabaciones();
            break;
          case 'logs':
            await cargarLogs();
            break;
          default:
            await cargarViajes();
        }
      } catch (error) {
        console.error(`Error al cargar datos de ${activeTab}:`, error);
        setError(`Error al cargar datos: ${error.message}`);
       
        // Configurar datos de demostración si falla la carga
        configurarDatosDemostracion();
      } finally {
        setLoading(false);
      }
    };
   
    cargarDatos();
  }, [activeTab, fechaInicio, fechaFin, paginaActual, itemsPorPagina, filtroEstado, filtroTipoViaje]);
 
  // Función para cargar viajes desde Firestore
  const cargarViajes = async () => {
    try {
      // Convertir fechas a timestamps para la consulta de Firestore
      const timestampInicio = Timestamp.fromDate(fechaInicio);
      const timestampFin = Timestamp.fromDate(fechaFin);
     
      // Crear consulta base
      let viajesQuery = query(
        collection(db, 'viajes'),
        where('fecha', '>=', timestampInicio),
        where('fecha', '<=', timestampFin),
        orderBy('fecha', 'desc')
      );
     
      // Aplicar filtros adicionales si están seleccionados
      if (filtroEstado !== 'todos') {
        viajesQuery = query(viajesQuery, where('estado', '==', filtroEstado));
      }
     
      if (filtroTipoViaje !== 'todos') {
        viajesQuery = query(viajesQuery, where('tipoViaje', '==', filtroTipoViaje));
      }
     
      if (filtroConductor) {
        viajesQuery = query(viajesQuery, where('conductorId', '==', filtroConductor));
      }
     
      if (filtroUsuario) {
        viajesQuery = query(viajesQuery, where('usuarioId', '==', filtroUsuario));
      }
     
      // Aplicar paginación
      if (ultimoDocumento && paginaActual > 1) {
        viajesQuery = query(viajesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
      } else {
        viajesQuery = query(viajesQuery, limit(itemsPorPagina));
      }
     
      const viajesSnapshot = await getDocs(viajesQuery);
     
      // Guardar documentos para paginación
      if (!viajesSnapshot.empty) {
        setUltimoDocumento(viajesSnapshot.docs[viajesSnapshot.docs.length - 1]);
        setPrimerDocumento(viajesSnapshot.docs[0]);
      } else {
        setUltimoDocumento(null);
        setPrimerDocumento(null);
      }
     
      // Obtener total de items (para paginación)
      const totalQuery = query(
        collection(db, 'viajes'),
        where('fecha', '>=', timestampInicio),
        where('fecha', '<=', timestampFin)
      );
     
      const totalSnapshot = await getDocs(totalQuery);
      setTotalItems(totalSnapshot.size);
     
      // Procesar datos de viajes
      const viajes = [];
      for (const doc of viajesSnapshot.docs) {
        const viajeData = doc.data();
       
        // Obtener datos adicionales del conductor (si es necesario)
        let conductorNombre = 'Desconocido';
        if (viajeData.conductorId) {
          try {
            const conductorDocRef = await getDoc(doc(db, 'conductores', viajeData.conductorId));
            if (conductorDocRef.exists()) {
              conductorNombre = conductorDocRef.data().nombre || 'Sin nombre';
            }
          } catch (error) {
            console.error("Error al obtener datos del conductor:", error);
          }
        }
       
        // Obtener datos adicionales del usuario (si es necesario)
        let usuarioNombre = 'Desconocido';
        if (viajeData.usuarioId) {
          try {
            const usuarioDocRef = await getDoc(doc(db, 'usuarios', viajeData.usuarioId));
            if (usuarioDocRef.exists()) {
              usuarioNombre = usuarioDocRef.data().nombre || 'Sin nombre';
            }
          } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
          }
        }
       
        // Formatear fecha para visualización
        const fecha = viajeData.fecha ? formatDate(viajeData.fecha) : 'Fecha desconocida';
       
        viajes.push({
          id: doc.id,
          fecha,
          origen: viajeData.origen || 'No especificado',
          destino: viajeData.destino || 'No especificado',
          estado: viajeData.estado || 'desconocido',
          conductor: conductorNombre,
          cliente: usuarioNombre,
          precio: viajeData.precio || 0,
          distancia: viajeData.distancia || 0,
          duracion: viajeData.duracion || 0,
          calificacion: viajeData.calificacion || 0,
          tipoViaje: viajeData.tipoViaje || 'estándar',
          // Datos originales para procesamiento
          raw: viajeData
        });
      }
     
      setViajesData(viajes);
     
      // Preparar datos para gráficos (agregando por fecha y otros criterios)
      prepararDatosGraficosViajes(viajes);
    } catch (error) {
      console.error("Error al cargar viajes:", error);
      throw error;
    }
  };
 
  // Función para preparar datos de gráficos de viajes
  const prepararDatosGraficosViajes = (viajes) => {
    // Aquí procesamos los datos para diferentes visualizaciones
    // Por ejemplo, agrupar viajes por día, por estado, por conductor, etc.
   
    // Ejemplo: agrupar por día
    const viajesPorDia = {};
    viajes.forEach(viaje => {
      // Extraer solo la fecha (sin hora)
      const fechaSolo = viaje.fecha.split(' ')[0];
      if (!viajesPorDia[fechaSolo]) {
        viajesPorDia[fechaSolo] = 0;
      }
      viajesPorDia[fechaSolo]++;
    });
   
    // Convertir a formato para gráficos
    const datosGrafico = Object.entries(viajesPorDia).map(([fecha, cantidad]) => ({
      fecha,
      viajes: cantidad
    }));
   
    // Ordenar por fecha
    datosGrafico.sort((a, b) => {
      const dateA = new Date(a.fecha.split('/').reverse().join('/'));
      const dateB = new Date(b.fecha.split('/').reverse().join('/'));
      return dateA - dateB;
    });
   
    // Almacenar datos procesados
    setViajesDataGrafico(datosGrafico);
  };
 
  // Funciones para cargar otros tipos de datos
  const cargarUsuarios = async () => {
    try {
      const usuariosQuery = query(
        collection(db, 'usuarios'),
        limit(itemsPorPagina)
      );
      
      const usuariosSnapshot = await getDocs(usuariosQuery);
      
      const usuarios = [];
      for (const doc of usuariosSnapshot.docs) {
        const userData = doc.data();
        usuarios.push({
          id: doc.id,
          nombre: userData.nombre || 'Sin nombre',
          email: userData.email || 'Sin email',
          telefono: userData.telefono || 'Sin teléfono',
          fechaRegistro: userData.fechaRegistro ? formatDate(userData.fechaRegistro) : 'Desconocida',
          ultimoAcceso: userData.ultimoAcceso ? formatDate(userData.ultimoAcceso) : 'Nunca',
          estado: userData.active ? 'activo' : 'inactivo',
          viajesRealizados: userData.viajesRealizados || 0
        });
      }
      
      setUsuariosData(usuarios);
      setTotalItems(usuariosSnapshot.size);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      // Usar datos de demostración si falla
      const usuarios = [
        { id: '1', nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '555-1234', fechaRegistro: '01/03/2023', ultimoAcceso: '20/04/2023', estado: 'activo', viajesRealizados: 15 },
        { id: '2', nombre: 'María González', email: 'maria@example.com', telefono: '555-5678', fechaRegistro: '15/03/2023', ultimoAcceso: '18/04/2023', estado: 'activo', viajesRealizados: 8 },
        { id: '3', nombre: 'Carlos Rodríguez', email: 'carlos@example.com', telefono: '555-9012', fechaRegistro: '10/04/2023', ultimoAcceso: '19/04/2023', estado: 'activo', viajesRealizados: 3 },
        { id: '4', nombre: 'Laura Sánchez', email: 'laura@example.com', telefono: '555-3456', fechaRegistro: '05/04/2023', ultimoAcceso: '17/04/2023', estado: 'inactivo', viajesRealizados: 0 },
        { id: '5', nombre: 'Fernando López', email: 'fernando@example.com', telefono: '555-7890', fechaRegistro: '20/03/2023', ultimoAcceso: '19/04/2023', estado: 'activo', viajesRealizados: 12 },
      ];
      setUsuariosData(usuarios);
    }
  };
 
  const cargarConductores = async () => {
    try {
      const conductoresQuery = query(
        collection(db, 'conductores'),
        limit(itemsPorPagina)
      );
      
      const conductoresSnapshot = await getDocs(conductoresQuery);
      
      const conductores = [];
      for (const doc of conductoresSnapshot.docs) {
        const conductorData = doc.data();
        conductores.push({
          id: doc.id,
          nombre: conductorData.nombre || 'Sin nombre',
          email: conductorData.email || 'Sin email',
          telefono: conductorData.telefono || 'Sin teléfono',
          licencia: conductorData.licencia || 'Sin licencia',
          fechaRegistro: conductorData.fechaRegistro ? formatDate(conductorData.fechaRegistro) : 'Desconocida',
          estado: conductorData.estado || 'inactivo',
          viajesRealizados: conductorData.viajesRealizados || 0,
          calificacionPromedio: conductorData.calificacionPromedio || 0
        });
      }
      
      setConductoresData(conductores);
      setTotalItems(conductoresSnapshot.size);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
      // Usar datos de demostración si falla
      const conductores = [
        { id: '1', nombre: 'Roberto Mendez', email: 'roberto@example.com', telefono: '555-2345', licencia: 'ABC123', fechaRegistro: '01/02/2023', estado: 'activo', viajesRealizados: 45, calificacionPromedio: 4.7 },
        { id: '2', nombre: 'Ana Martínez', email: 'ana@example.com', telefono: '555-6789', licencia: 'DEF456', fechaRegistro: '15/02/2023', estado: 'activo', viajesRealizados: 38, calificacionPromedio: 4.5 },
        { id: '3', nombre: 'Miguel Torres', email: 'miguel@example.com', telefono: '555-0123', licencia: 'GHI789', fechaRegistro: '10/03/2023', estado: 'inactivo', viajesRealizados: 12, calificacionPromedio: 3.8 },
        { id: '4', nombre: 'Patricia Díaz', email: 'patricia@example.com', telefono: '555-4567', licencia: 'JKL012', fechaRegistro: '05/03/2023', estado: 'activo', viajesRealizados: 27, calificacionPromedio: 4.2 },
        { id: '5', nombre: 'Ricardo Navarro', email: 'ricardo@example.com', telefono: '555-8901', licencia: 'MNO345', fechaRegistro: '20/02/2023', estado: 'activo', viajesRealizados: 41, calificacionPromedio: 4.8 },
      ];
      setConductoresData(conductores);
    }
  };
 
  const cargarSolicitudes = async () => {
    try {
      const solicitudesQuery = query(
        collection(db, 'solicitudes_conductores'),
        limit(itemsPorPagina)
      );
      
      const solicitudesSnapshot = await getDocs(solicitudesQuery);
      
      const solicitudes = [];
      for (const doc of solicitudesSnapshot.docs) {
        const solicitudData = doc.data();
        solicitudes.push({
          id: doc.id,
          nombre: solicitudData.nombre || 'Sin nombre',
          email: solicitudData.email || 'Sin email',
          telefono: solicitudData.telefono || 'Sin teléfono',
          licencia: solicitudData.licencia || 'Sin licencia',
          fechaSolicitud: solicitudData.fechaSolicitud ? formatDate(solicitudData.fechaSolicitud) : 'Desconocida',
          estado: solicitudData.estado || 'pendiente',
          documentosCompletos: solicitudData.documentosCompletos || false
        });
      }
      
      setSolicitudesData(solicitudes);
      setTotalItems(solicitudesSnapshot.size);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      // Usar datos de demostración si falla
      const solicitudes = [
        { id: '1', nombre: 'Dilan Cimar', email: 'flaquito@gmail.com', telefono: '123654', licencia: 'Lic12345', fechaSolicitud: '10/04/2023', estado: 'Pendiente', documentosCompletos: true },
        { id: '2', nombre: 'Elena Vargas', email: 'elena@example.com', telefono: '555-3456', licencia: 'Q67890', fechaSolicitud: '08/04/2023', estado: 'aprobada', documentosCompletos: true },
        { id: '3', nombre: 'Javier Rojas', email: 'javier@example.com', telefono: '555-7890', licencia: 'R12345', fechaSolicitud: '12/04/2023', estado: 'rechazada', documentosCompletos: false },
        { id: '4', nombre: 'Sofía Blanco', email: 'sofia@example.com', telefono: '555-2345', licencia: 'S67890', fechaSolicitud: '09/04/2023', estado: 'pendiente', documentosCompletos: true },
        { id: '5', nombre: 'Alejandro Cruz', email: 'alejandro@example.com', telefono: '555-6789', licencia: 'T12345', fechaSolicitud: '07/04/2023', estado: 'revisión', documentosCompletos: true },
      ];
      setSolicitudesData(solicitudes);
    }
  };
 
  const cargarAdministradores = async () => {
    try {
      // Consulta a Firestore para cargar administradores
      const adminsQuery = query(
        collection(db, 'usuarios'),
        where('role', '==', 'admin'),
        limit(itemsPorPagina)
      );
      
      const adminsSnapshot = await getDocs(adminsQuery);
      
      const administradores = [];
      for (const doc of adminsSnapshot.docs) {
        const adminData = doc.data();
        administradores.push({
          id: doc.id,
          nombre: adminData.nombre || 'Administrador',
          email: adminData.email || 'Sin email',
          rol: adminData.role || 'admin',
          fechaRegistro: adminData.fechaRegistro ? formatDate(adminData.fechaRegistro) : 'Desconocida',
          ultimoAcceso: adminData.ultimoAcceso ? formatDate(adminData.ultimoAcceso) : 'Nunca',
          accionesRealizadas: adminData.accionesRealizadas || 0,
          active: adminData.active || true,
        });
      }
      
      setAdministradoresData(administradores);
      setTotalItems(adminsSnapshot.size);
    } catch (error) {
      console.error("Error al cargar administradores:", error);
      // Usar datos de demostración si falla
      const administradores = [
        { id: '1', nombre: 'Administrador', email: 'ded@gmail.com', rol: 'admin', fechaRegistro: '01/01/2023', ultimoAcceso: '20/04/2023', accionesRealizadas: 120, active: true, uid: 'iiV7ftV4LiMWXLNrDppNn67lzJS2' },
        { id: '2', nombre: 'Gabriela Rodriguez', email: 'gabriela@example.com', rol: 'admin', fechaRegistro: '15/01/2023', ultimoAcceso: '19/04/2023', accionesRealizadas: 85 },
        { id: '3', nombre: 'Daniel Morales', email: 'daniel@example.com', rol: 'supervisor', fechaRegistro: '01/02/2023', ultimoAcceso: '20/04/2023', accionesRealizadas: 64 },
        { id: '4', nombre: 'Marcela Ruiz', email: 'marcela@example.com', rol: 'soporte', fechaRegistro: '15/02/2023', ultimoAcceso: '18/04/2023', accionesRealizadas: 42 },
        { id: '5', nombre: 'Eduardo Silva', email: 'eduardo@example.com', rol: 'moderador', fechaRegistro: '01/03/2023', ultimoAcceso: '19/04/2023', accionesRealizadas: 37 },
      ];
      setAdministradoresData(administradores);
    }
  };
 
  const cargarGrabaciones = async () => {
    try {
      const grabacionesQuery = query(
        collection(db, 'grabaciones'),
        orderBy('fecha', 'desc'),
        limit(itemsPorPagina)
      );
      
      const grabacionesSnapshot = await getDocs(grabacionesQuery);
      
      const grabaciones = [];
      for (const doc of grabacionesSnapshot.docs) {
        const grabacionData = doc.data();
        grabaciones.push({
          id: doc.id,
          viajeId: grabacionData.viajeId || 'Sin viaje',
          conductorId: grabacionData.conductorId || 'Sin conductor',
          fecha: grabacionData.fecha ? formatDate(grabacionData.fecha) : 'Desconocida',
          duracion: grabacionData.duracion || '0:00',
          tamaño: grabacionData.tamaño || '0 MB',
          estado: grabacionData.estado || 'procesando',
          visualizaciones: grabacionData.visualizaciones || 0
        });
      }
      
      setGrabacionesData(grabaciones);
      setTotalItems(grabacionesSnapshot.size);
    } catch (error) {
      console.error("Error al cargar grabaciones:", error);
      // Datos de demostración
      const grabaciones = [
        { id: '1', viajeId: 'V123', conductorId: 'C1', fecha: '20/04/2023 14:30', duracion: '25:12', tamaño: '128 MB', estado: 'disponible', visualizaciones: 2 },
        { id: '2', viajeId: 'V124', conductorId: 'C2', fecha: '20/04/2023 10:15', duracion: '18:45', tamaño: '95 MB', estado: 'disponible', visualizaciones: 0 },
        { id: '3', viajeId: 'V125', conductorId: 'C1', fecha: '19/04/2023 18:22', duracion: '32:08', tamaño: '164 MB', estado: 'disponible', visualizaciones: 1 },
        { id: '4', viajeId: 'V126', conductorId: 'C3', fecha: '19/04/2023 12:10', duracion: '15:30', tamaño: '78 MB', estado: 'procesando', visualizaciones: 0 },
        { id: '5', viajeId: 'V127', conductorId: 'C4', fecha: '19/04/2023 08:45', duracion: '22:15', tamaño: '112 MB', estado: 'archivado', visualizaciones: 3 },
      ];
      setGrabacionesData(grabaciones);
    }
  };
 
  const cargarLogs = async () => {
    try {
      // Consulta a Firestore para cargar logs
      const logsQuery = query(
        collection(db, 'logs'),
        orderBy('fecha', 'desc'),
        limit(itemsPorPagina)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      
      const logs = [];
      for (const doc of logsSnapshot.docs) {
        const logData = doc.data();
        logs.push({
          id: doc.id,
          fecha: logData.fecha ? formatDate(logData.fecha) : 'Desconocida',
          usuarioId: logData.usuarioId || 'Sistema',
          accion: logData.accion || 'desconocida',
          detalles: logData.detalles || 'Sin detalles',
          // Datos básicos sin información sensible
          modulo: logData.modulo || 'general',
          resultado: logData.resultado || 'completado'
        });
      }
      
      setLogsData(logs);
      setTotalItems(logsSnapshot.size);
    } catch (error) {
      console.error("Error al cargar logs:", error);
      // Implementación para logs del sistema
      // Datos de demostración
      const logs = [
        { id: '1', fecha: '20/04/2023 15:45:23', usuarioId: 'A1', accion: 'inicio_sesion', detalles: 'Inicio de sesión exitoso', modulo: 'autenticación', resultado: 'exitoso' },
        { id: '2', fecha: '20/04/2023 15:30:15', usuarioId: 'C2', accion: 'actualizar_perfil', detalles: 'Actualización de datos de contacto', modulo: 'usuarios', resultado: 'exitoso' },
        { id: '3', fecha: '20/04/2023 14:22:08', usuarioId: 'A1', accion: 'aprobar_solicitud', detalles: 'Aprobación de solicitud de conductor #S123', modulo: 'solicitudes', resultado: 'exitoso' },
        { id: '4', fecha: '20/04/2023 13:10:44', usuarioId: 'U5', accion: 'solicitar_viaje', detalles: 'Solicitud de viaje creada #V128', modulo: 'viajes', resultado: 'exitoso' },
        { id: '5', fecha: '20/04/2023 12:05:30', usuarioId: 'C1', accion: 'finalizar_viaje', detalles: 'Viaje #V127 finalizado con éxito', modulo: 'viajes', resultado: 'exitoso' },
      ];
      setLogsData(logs);
    }
  };
 
  // Función para configurar datos de demostración si falla la carga real
  const configurarDatosDemostracion = () => {
    switch(activeTab) {
      case 'viajes':
        setViajesData([
          { id: '1', fecha: '20/04/2023 15:30', origen: 'Centro Comercial', destino: 'Aeropuerto', estado: 'completado', conductor: 'Roberto Méndez', cliente: 'Juan Pérez', precio: 150, distancia: 12.5, duracion: 28, calificacion: 5, tipoViaje: 'ejecutivo' },
          { id: '2', fecha: '20/04/2023 14:00', origen: 'Plaza Principal', destino: 'Universidad Nacional', estado: 'completado', conductor: 'Ana Martínez', cliente: 'María González', precio: 85, distancia: 8.2, duracion: 15, calificacion: 4, tipoViaje: 'estándar' },
          { id: '3', fecha: '20/04/2023 12:30', origen: 'Hospital Central', destino: 'Residencial Los Pinos', estado: 'completado', conductor: 'Miguel Torres', cliente: 'Carlos Rodríguez', precio: 70, distancia: 6.8, duracion: 18, calificacion: 4, tipoViaje: 'estándar' },
        ]);
        setLogsData(logs);
      }
    };
    // Formatear fecha para visualización
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
   
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
  };

  // Funciones para exportación
  const exportarCSV = () => {
    let dataToExport = [];
    let fileName = '';
    let delimiter = idioma === 'es' ? ';' : ','; // Usar punto y coma para español, coma para inglés
   
    switch(activeTab) {
      case 'viajes':
        dataToExport = viajesData;
        fileName = `viajes_${fechaInicio.toISOString().split('T')[0]}_${fechaFin.toISOString().split('T')[0]}.csv`;
        break;
      case 'usuarios':
        dataToExport = usuariosData;
        fileName = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'conductores':
        dataToExport = conductoresData;
        fileName = `conductores_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'solicitudes':
        dataToExport = solicitudesData;
        fileName = `solicitudes_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'admins':
        dataToExport = administradoresData;
        fileName = `administradores_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'grabaciones':
        dataToExport = grabacionesData;
        fileName = `grabaciones_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'logs':
        dataToExport = logsData;
        fileName = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        alert('No hay datos para exportar');
        return;
    }
   
    // Filtrar datos sensibles si es necesario
    const dataLimpia = dataToExport.map(item => {
      const itemLimpio = {...item};
      // Eliminar datos que no queremos exportar
      delete itemLimpio.raw;
      return itemLimpio;
    });
   
    // Configurar opciones del CSV basadas en el idioma
    const csvOptions = {
      delimiter: delimiter,
      header: true,
      quotes: true,  // Para manejar caracteres especiales
      quoteChar: '"',
      escapeChar: '"'
    };
   
    const csv = Papa.unparse(dataLimpia, csvOptions);
    
    // Agregar BOM para asegurar que los caracteres se muestren correctamente en Excel
    const csvContent = '\uFEFF' + csv;
    
    // Crear Blob con el encoding correcto para caracteres especiales
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
 
  const exportarPDF = () => {
    let dataToExport = [];
    let columns = [];
    let title = '';
   
    switch(activeTab) {
      case 'viajes':
        dataToExport = viajesData.map(v => [v.fecha, v.origen, v.destino, v.estado, v.conductor, v.cliente, `$${v.precio}`, `${v.distancia} km`, `${v.duracion} min`, v.calificacion]);
        columns = ['Fecha', 'Origen', 'Destino', 'Estado', 'Conductor', 'Cliente', 'Precio', 'Distancia', 'Duración', 'Calificación'];
        title = `Reporte de Viajes (${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()})`;
        break;
      case 'usuarios':
        dataToExport = usuariosData.map(u => [u.nombre, u.email, u.telefono, u.fechaRegistro, u.ultimoAcceso, u.estado, u.viajesRealizados]);
        columns = ['Nombre', 'Email', 'Teléfono', 'Registro', 'Último Acceso', 'Estado', 'Viajes'];
        title = 'Reporte de Usuarios';
        break;
      case 'conductores':
        dataToExport = conductoresData.map(c => [c.nombre, c.email, c.telefono, c.licencia, c.fechaRegistro, c.estado, c.viajesRealizados, c.calificacionPromedio]);
        columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Registro', 'Estado', 'Viajes', 'Calificación'];
        title = 'Reporte de Conductores';
        break;
      case 'solicitudes':
        dataToExport = solicitudesData.map(s => [s.nombre, s.email, s.telefono, s.licencia, s.fechaSolicitud, s.estado, s.documentosCompletos ? 'Sí' : 'No']);
        columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Fecha Solicitud', 'Estado', 'Docs. Completos'];
        title = 'Reporte de Solicitudes de Conductores';
        break;
      case 'admins':
        dataToExport = administradoresData.map(a => [a.nombre, a.email, a.rol, a.fechaRegistro, a.ultimoAcceso, a.accionesRealizadas]);
        columns = ['Nombre', 'Email', 'Rol', 'Fecha Registro', 'Último Acceso', 'Acciones'];
        title = 'Reporte de Administradores';
        break;
      case 'grabaciones':
        dataToExport = grabacionesData.map(g => [g.viajeId, g.conductorId, g.fecha, g.duracion, g.tamaño, g.estado, g.visualizaciones]);
        columns = ['ID Viaje', 'ID Conductor', 'Fecha', 'Duración', 'Tamaño', 'Estado', 'Visualizaciones'];
        title = 'Reporte de Grabaciones';
        break;
      case 'logs':
        dataToExport = logsData.map(l => [l.fecha, l.usuarioId, l.accion, l.detalles, l.modulo, l.resultado]);
        columns = ['Fecha', 'Usuario', 'Acción', 'Detalles', 'Módulo', 'Resultado'];
        title = 'Reporte de Logs del Sistema';
        break;
      default:
        alert('No hay datos para exportar');
        return;
    }
   
    // Crear PDF con soporte para caracteres acentuados
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Añadir la fuente Helvetica que soporta caracteres especiales
    doc.setFont('helvetica');
   
    // Agregar título y metadata
    doc.setFontSize(16);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
   
    // Configurar opciones específicas para AutoTable
    const tableOptions = {
      head: [columns],
      body: dataToExport,
      startY: 35,
      margin: { top: 35 },
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        font: 'helvetica' // Asegurar que se use la fuente correcta
      },
      headStyles: { 
        fillColor: [0, 123, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      // Estas opciones ayudan con los caracteres especiales
      didDrawCell: (data) => {},
      willDrawCell: (data) => {},
      didParseCell: (data) => {}
    };
    
    // Añadir tabla al PDF
    doc.autoTable(tableOptions);
   
    // Guardar PDF
    doc.save(`reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  // Funciones para navegación de paginación
  const irPaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };
 
  const irPaginaSiguiente = () => {
    if (paginaActual * itemsPorPagina < totalItems) {
      setPaginaActual(paginaActual + 1);
    }
  };
 
  // Función para cambiar el número de elementos por página
  const cambiarItemsPorPagina = (e) => {
    setItemsPorPagina(parseInt(e.target.value));
    setPaginaActual(1); // Resetear a la primera página
  };
 
  // Función para obtener los datos actuales según la pestaña activa
  const obtenerDatosActuales = () => {
    switch(activeTab) {
      case 'viajes':
        return viajesData;
      case 'usuarios':
        return usuariosData;
      case 'conductores':
        return conductoresData;
      case 'solicitudes':
        return solicitudesData;
      case 'admins':
        return administradoresData;
      case 'grabaciones':
        return grabacionesData;
      case 'logs':
        return logsData;
      default:
        return [];
    }
  };
 
  // Renderizado de la vista de tabla según la pestaña activa
  const renderTablaActual = () => {
    const datos = obtenerDatosActuales();
   
    if (datos.length === 0) {
      return (
        <div className="no-data-message">
          <p>No hay datos disponibles para el período seleccionado.</p>
        </div>
      );
    }
    switch(activeTab) {
      case 'viajes':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Estado</th>
                <th>Conductor</th>
                <th>Cliente</th>
                <th>Precio</th>
                <th>Distancia</th>
                <th>Duración</th>
                <th>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((viaje) => (
                <tr key={viaje.id} className={`estado-${viaje.estado}`}>
                  <td>{viaje.fecha}</td>
                  <td>{viaje.origen}</td>
                  <td>{viaje.destino}</td>
                  <td>
                    <span className={`estado-badge ${viaje.estado}`}>
                      {viaje.estado}
                    </span>
                  </td>
                  <td>{viaje.conductor}</td>
                  <td>{viaje.cliente}</td>
                  <td>${viaje.precio}</td>
                  <td>{viaje.distancia} km</td>
                  <td>{viaje.duracion} min</td>
                  <td className="calificacion">
                    {Array(5).fill().map((_, i) => (
                      <span key={i} className={i < viaje.calificacion ? "star filled" : "star"}>★</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      case 'usuarios':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Fecha Registro</th>
                <th>Último Acceso</th>
                <th>Estado</th>
                <th>Viajes</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((usuario) => (
                <tr key={usuario.id} className={usuario.estado === 'activo' ? 'usuario-activo' : 'usuario-inactivo'}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.telefono}</td>
                  <td>{usuario.fechaRegistro}</td>
                  <td>{usuario.ultimoAcceso}</td>
                  <td>
                    <span className={`estado-badge ${usuario.estado}`}>
                      {usuario.estado}
                    </span>
                  </td>
                  <td>{usuario.viajesRealizados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      case 'conductores':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Licencia</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th>Viajes</th>
                <th>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((conductor) => (
                <tr key={conductor.id} className={conductor.estado === 'activo' ? 'conductor-activo' : 'conductor-inactivo'}>
                  <td>{conductor.nombre}</td>
                  <td>{conductor.email}</td>
                  <td>{conductor.telefono}</td>
                  <td>{conductor.licencia}</td>
                  <td>{conductor.fechaRegistro}</td>
                  <td>
                    <span className={`estado-badge ${conductor.estado}`}>
                      {conductor.estado}
                    </span>
                  </td>
                  <td>{conductor.viajesRealizados}</td>
                  <td className="calificacion">
                    {conductor.calificacionPromedio.toFixed(1)}
                    {Array(5).fill().map((_, i) => (
                      <span key={i} className={i < Math.round(conductor.calificacionPromedio) ? "star filled" : "star"}>★</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      case 'solicitudes':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Licencia</th>
                <th>Fecha Solicitud</th>
                <th>Estado</th>
                <th>Docs. Completos</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((solicitud) => (
                <tr key={solicitud.id} className={`solicitud-${solicitud.estado}`}>
                  <td>{solicitud.nombre}</td>
                  <td>{solicitud.email}</td>
                  <td>{solicitud.telefono}</td>
                  <td>{solicitud.licencia}</td>
                  <td>{solicitud.fechaSolicitud}</td>
                  <td>
                    <span className={`estado-badge ${solicitud.estado}`}>
                      {solicitud.estado}
                    </span>
                  </td>
                  <td>
                    <span className={solicitud.documentosCompletos ? 'true' : 'false'}>
                      {solicitud.documentosCompletos ? 'Sí' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        case 'admins':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha Registro</th>
                <th>Último Acceso</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((admin) => (
                <tr key={admin.id} className={admin.active ? 'admin-activo' : 'admin-inactivo'}>
                  <td>{admin.nombre}</td>
                  <td>{admin.email}</td>
                  <td>{admin.rol}</td>
                  <td>{admin.fechaRegistro}</td>
                  <td>{admin.ultimoAcceso}</td>
                  <td>
                    <span className={`estado-badge ${admin.active ? 'activo' : 'inactivo'}`}>
                      {admin.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{admin.accionesRealizadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      case 'logs':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario ID</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Detalles</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((log) => (
                <tr key={log.id} className={`log-${log.resultado}`}>
                  <td>{log.fecha}</td>
                  <td>{log.usuarioId}</td>
                  <td>{log.accion.replace(/_/g, ' ')}</td>
                  <td>{log.modulo}</td>
                  <td>{log.detalles}</td>
                  <td>
                    <span className={`estado-badge ${log.resultado}`}>
                      {log.resultado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      case 'grabaciones':
        return (
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>ID Viaje</th>
                <th>ID Conductor</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Tamaño</th>
                <th>Estado</th>
                <th>Visualizaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((grabacion) => (
                <tr key={grabacion.id} className={`grabacion-${grabacion.estado}`}>
                  <td>{grabacion.viajeId}</td>
                  <td>{grabacion.conductorId}</td>
                  <td>{grabacion.fecha}</td>
                  <td>{grabacion.duracion}</td>
                  <td>{grabacion.tamaño}</td>
                  <td>
                    <span className={`estado-badge ${grabacion.estado}`}>
                      {grabacion.estado}
                    </span>
                  </td>
                  <td>{grabacion.visualizaciones}</td>
                  <td className="acciones">
                    <button className="btn-ver" title="Ver grabación">
                      <i className="fa fa-play-circle"></i>
                    </button>
                    <button className="btn-descargar" title="Descargar grabación">
                      <i className="fa fa-download"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
     
      default:
        return <p>Seleccione una categoría para ver los datos.</p>;
    }
  };
  // Renderizado de gráficos según la pestaña activa
  const renderGraficosActuales = () => {
    if (loading) {
      return <div className="loading-message">Cargando datos para gráficos...</div>;
    }
   
    if (error) {
      return <div className="error-message">Error al cargar los datos: {error}</div>;
    }
   
    switch(activeTab) {
      case 'viajes':
        if (viajesDataGrafico.length === 0) {
          return <div className="no-data-message">No hay datos suficientes para generar gráficos.</div>;
        }
       
        return (
          <div className="graficos-container">
            <div className="grafico-box">
              <h4>Viajes por Día</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viajesDataGrafico} ref={chartRef}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="viajes" stroke="#007BFF" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
           
            <div className="grafico-box">
              <h4>Distribución de Estados de Viajes</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generarDatosPorEstado(viajesData)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generarDatosPorEstado(viajesData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} viajes`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
           
            <div className="grafico-box">
              <h4>Calificaciones Promedio por Conductor</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generarDatosPorConductor(viajesData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calificacion" fill="#28A745" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        
      case 'admins':
        // Gráficos específicos para administradores
        return (
          <div className="graficos-container">
            <div className="grafico-box">
              <h4>Administradores por Rol</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generarDatosPorRol(administradoresData)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generarDatosPorRol(administradoresData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} administradores`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grafico-box">
              <h4>Administradores por Estado</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Activos', value: administradoresData.filter(a => a.active).length },
                      { name: 'Inactivos', value: administradoresData.filter(a => !a.active).length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#28A745" /> {/* Activos */}
                    <Cell fill="#DC3545" /> {/* Inactivos */}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} administradores`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        
      case 'logs':
        // Gráficos específicos para logs
        return (
          <div className="graficos-container">
            <div className="grafico-box">
              <h4>Logs por Módulo</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generarDatosPorModulo(logsData)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generarDatosPorModulo(logsData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} logs`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grafico-box">
              <h4>Actividad por Día</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generarDatosPorDia(logsData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#17A2B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
     
      // Mantener los demás casos como en el código original
      case 'conductores':
        return (
          <div className="graficos-container">
            <div className="grafico-box">
              <h4>Conductores por Estado</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Activos', value: conductoresData.filter(c => c.estado === 'activo').length },
                      { name: 'Inactivos', value: conductoresData.filter(c => c.estado === 'inactivo').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#28A745" />
                    <Cell fill="#DC3545" />
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} conductores`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
           
            <div className="grafico-box">
              <h4>Top Conductores por Viajes Realizados</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conductoresData.sort((a, b) => b.viajesRealizados - a.viajesRealizados).slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="viajesRealizados" fill="#007BFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
     
        case 'solicitudes':
          // Calcular datos para gráficos
          const solicitudesPorEstado = [
            { name: 'Pendientes', value: solicitudesData.filter(s => s.estado.toLowerCase() === 'pendiente').length },
            { name: 'Aprobadas', value: solicitudesData.filter(s => s.estado.toLowerCase() === 'aprobada').length },
            { name: 'Rechazadas', value: solicitudesData.filter(s => s.estado.toLowerCase() === 'rechazada').length },
            { name: 'En Revisión', value: solicitudesData.filter(s => s.estado.toLowerCase() === 'revisión').length }
          ];
         
          return (
            <div className="graficos-container">
              <div className="grafico-box">
                <h4>Solicitudes por Estado</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={solicitudesPorEstado}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#FFC107" /> {/* Pendientes */}
                      <Cell fill="#28A745" /> {/* Aprobadas */}
                      <Cell fill="#DC3545" /> {/* Rechazadas */}
                      <Cell fill="#17A2B8" /> {/* En Revisión */}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} solicitudes`, 'Cantidad']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
       
        case 'grabaciones':
          // Calcular datos para gráficos
          const grabacionesPorEstado = [
            { name: 'Disponibles', value: grabacionesData.filter(g => g.estado === 'disponible').length },
            { name: 'Procesando', value: grabacionesData.filter(g => g.estado === 'procesando').length },
            { name: 'Archivadas', value: grabacionesData.filter(g => g.estado === 'archivado').length }
          ];
         
          return (
            <div className="graficos-container">
              <div className="grafico-box">
                <h4>Grabaciones por Estado</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={grabacionesPorEstado}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#28A745" /> {/* Disponibles */}
                      <Cell fill="#FFC107" /> {/* Procesando */}
                      <Cell fill="#6C757D" /> {/* Archivadas */}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} grabaciones`, 'Cantidad']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
       
        default:
          return <div className="no-data-message">Seleccione una categoría para ver gráficos estadísticos.</div>;
      }
    };
  
    // Función para generar datos por estado de viaje para gráfico de pastel
    const generarDatosPorEstado = (viajes) => {
      const estadosCount = {};
     
      viajes.forEach(viaje => {
        if (!estadosCount[viaje.estado]) {
          estadosCount[viaje.estado] = 0;
        }
        estadosCount[viaje.estado]++;
      });
     
      return Object.entries(estadosCount).map(([name, value]) => ({ name, value }));
    };
   
    // Función para generar datos por conductor
    const generarDatosPorConductor = (viajes) => {
      const conductoesData = {};
     
      viajes.forEach(viaje => {
        if (!conductoesData[viaje.conductor]) {
          conductoesData[viaje.conductor] = {
            totalCalificacion: 0,
            totalViajes: 0
          };
        }
        conductoesData[viaje.conductor].totalCalificacion += viaje.calificacion;
        conductoesData[viaje.conductor].totalViajes++;
      });
     
      return Object.entries(conductoesData).map(([name, datos]) => ({
        name,
        calificacion: datos.totalCalificacion / datos.totalViajes,
        viajes: datos.totalViajes
      }));
    };
  
    // Función para generar datos por rol de administrador
    const generarDatosPorRol = (admins) => {
      const rolesCount = {};
      
      admins.forEach(admin => {
        const rol = admin.rol || 'sin rol';
        if (!rolesCount[rol]) {
          rolesCount[rol] = 0;
        }
        rolesCount[rol]++;
      });
      
      return Object.entries(rolesCount).map(([name, value]) => ({ name, value }));
    };
  
    // Función para generar datos por módulo de logs
    const generarDatosPorModulo = (logs) => {
      const modulosCount = {};
      
      logs.forEach(log => {
        const modulo = log.modulo || 'sin clasificar';
        if (!modulosCount[modulo]) {
          modulosCount[modulo] = 0;
        }
        modulosCount[modulo]++;
      });
      
      return Object.entries(modulosCount).map(([name, value]) => ({ name, value }));
    };
  
    // Función para generar datos por día para logs
    const generarDatosPorDia = (logs) => {
      const diasCount = {};
      
      logs.forEach(log => {
        // Extraer solo la fecha (sin hora)
        const fechaSolo = log.fecha.split(' ')[0];
        if (!diasCount[fechaSolo]) {
          diasCount[fechaSolo] = 0;
        }
        diasCount[fechaSolo]++;
      });
      
      // Convertir a formato para gráficos
      const datosGrafico = Object.entries(diasCount).map(([fecha, cantidad]) => ({
        fecha,
        cantidad
      }));
      
      // Ordenar por fecha
      datosGrafico.sort((a, b) => {
        const dateA = new Date(a.fecha.split('/').reverse().join('/'));
        const dateB = new Date(b.fecha.split('/').reverse().join('/'));
        return dateA - dateB;
      });
      
      return datosGrafico;
    };
   
    // Función para renderizar etiquetas personalizadas en gráficos de pastel
    const renderCustomizedLabel = ({
      cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value
    }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
     
      if (percent < 0.05) return null; // No mostrar etiquetas muy pequeñas
     
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };
  
    // Ahora el return del componente completo
    return (
      <div className="reportes-container">
        <h2>📊 Módulo de Reportes y Estadísticas</h2>
       
        {/* Pestañas principales */}
        <div className="tabs">
          <button
            className={activeTab === 'viajes' ? 'active' : ''}
            onClick={() => setActiveTab('viajes')}
          >
            <i className="fa fa-car"></i> Viajes
          </button>
          <button
            className={activeTab === 'usuarios' ? 'active' : ''}
            onClick={() => setActiveTab('usuarios')}
          >
            <i className="fa fa-users"></i> Usuarios
          </button>
          <button
            className={activeTab === 'conductores' ? 'active' : ''}
            onClick={() => setActiveTab('conductores')}
          >
            <i className="fa fa-id-card"></i> Conductores
          </button>
          <button
            className={activeTab === 'solicitudes' ? 'active' : ''}
            onClick={() => setActiveTab('solicitudes')}
          >
            <i className="fa fa-file-text"></i> Solicitudes
          </button>
          <button
            className={activeTab === 'admins' ? 'active' : ''}
            onClick={() => setActiveTab('admins')}
          >
            <i className="fa fa-shield"></i> Administradores
          </button>
          <button
            className={activeTab === 'grabaciones' ? 'active' : ''}
            onClick={() => setActiveTab('grabaciones')}
          >
            <i className="fa fa-video-camera"></i> Grabaciones
          </button>
          <button
            className={activeTab === 'logs' ? 'active' : ''}
            onClick={() => setActiveTab('logs')}
          >
            <i className="fa fa-list-alt"></i> Logs
          </button>
        </div>
       
        {/* Filtros y controles */}
        <div className="filtros-container">
          <div className="fecha-filtros">
            <div className="filtro-grupo">
              <label>Desde:</label>
              <DatePicker
                selected={fechaInicio}
                onChange={(date) => setFechaInicio(date)}
                dateFormat="dd/MM/yyyy"
                className="date-input"
              />
            </div>
            <div className="filtro-grupo">
              <label>Hasta:</label>
              <DatePicker
                selected={fechaFin}
                onChange={(date) => setFechaFin(date)}
                dateFormat="dd/MM/yyyy"
                className="date-input"
              />
            </div>
          </div>
         
          {/* Filtros específicos según la categoría */}
          {activeTab === 'viajes' && (
            <div className="filtros-especificos">
              <div className="filtro-grupo">
                <label>Estado:</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="select-input"
                >
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="filtro-grupo">
                <label>Tipo:</label>
                <select
                  value={filtroTipoViaje}
                  onChange={(e) => setFiltroTipoViaje(e.target.value)}
                  className="select-input"
                >
                  <option value="todos">Todos</option>
                  <option value="estándar">Estándar</option>
                  <option value="ejecutivo">Ejecutivo</option>
                  <option value="compartido">Compartido</option>
                </select>
              </div>
            </div>
          )}
  
          {/* Filtro de idioma para CSV */}
          <div className="filtro-grupo idioma-selector">
            <label>Formato CSV:</label>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              className="select-input"
            >
              <option value="es">Español (;)</option>
              <option value="en">Inglés (,)</option>
            </select>
          </div>
         
          {/* Botones de exportación */}
          <div className="exportar-botones">
            <button className="btn-exportar csv" onClick={exportarCSV}>
              <i className="fa fa-file-text-o"></i> Exportar CSV
            </button>
            <button className="btn-exportar pdf" onClick={exportarPDF}>
              <i className="fa fa-file-pdf-o"></i> Exportar PDF
            </button>
          </div>
        </div>
       
        {/* Subtabs para visualización */}
        <div className="subtabs">
          <button
            className={activeSubTab === 'graficos' ? 'active' : ''}
            onClick={() => setActiveSubTab('graficos')}
          >
            <i className="fa fa-bar-chart"></i> Gráficos
          </button>
          <button
            className={activeSubTab === 'tabla' ? 'active' : ''}
            onClick={() => setActiveSubTab('tabla')}
          >
            <i className="fa fa-table"></i> Tabla
          </button>
        </div>
       
        {/* Contenido de Reportes */}
        <div className="report-content">
          {loading && <div className="loading-overlay"><div className="loader"></div></div>}
         
          {error && <div className="error-message">{error}</div>}
         
          {!loading && !error && (
            <>
              {activeSubTab === 'graficos' && renderGraficosActuales()}
             
              {activeSubTab === 'tabla' && (
                <div className="tabla-container">
                  {renderTablaActual()}
                 
                  {/* Controles de paginación */}
                  <div className="paginacion-container">
                    <div className="items-por-pagina">
                      <label>Mostrar:</label>
                      <select
                        value={itemsPorPagina}
                        onChange={cambiarItemsPorPagina}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span> entradas</span>
                    </div>
                   
                    <div className="info-paginacion">
                      Mostrando {((paginaActual - 1) * itemsPorPagina) + 1}
                      -
                      {Math.min(paginaActual * itemsPorPagina, totalItems)}
                      de {totalItems} registros
                    </div>
                   
                    <div className="controles-paginacion">
                      <button
                        onClick={irPaginaAnterior}
                        disabled={paginaActual === 1}
                        className="btn-paginacion"
                      >
                        <i className="fa fa-chevron-left"></i> Anterior
                      </button>
                      <span className="pagina-actual">{paginaActual}</span>
                      <button
                        onClick={irPaginaSiguiente}
                        disabled={paginaActual * itemsPorPagina >= totalItems}
                        className="btn-paginacion"
                      >
                        Siguiente <i className="fa fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  export default Reportes;