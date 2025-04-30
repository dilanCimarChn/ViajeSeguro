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
  
  // Estados para métricas de negocio
  const [metricasViajes, setMetricasViajes] = useState({
    gananciaTotal: 0,
    viajesCompletados: 0,
    viajesCancelados: 0,
    distanciaTotal: 0,
    distanciaPromedio: 0,
    tarifaPromedio: 0,
    gananciaDiaria: {}
  });
  
  const [metricasConductores, setMetricasConductores] = useState({
    activos: 0,
    inactivos: 0,
    totalViajes: 0,
    calificacionPromedio: 0
  });
  
  const [metricasSolicitudes, setMetricasSolicitudes] = useState({
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    tiempoPromedioAprobacion: 0
  });
  
  // URL del logo para los reportes PDF
  const logoUrl = 'https://i.ibb.co/xtN8mjLv/logo.png';
 
  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A64AC9', '#FF5A5F', '#3CAEA3'];
  
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
  
  // Formato de fecha solo (sin hora) para archivos y títulos
  const formatDateShort = (date) => {
    try {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error al formatear fecha corta:", error);
      return 'Fecha inválida';
    }
  };
  
  // Función para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

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
        configurarDatosDemostracion();
      } finally {
        setLoading(false);
      }
    };
   
    cargarDatos();
  }, [activeTab, fechaInicio, fechaFin, paginaActual, itemsPorPagina, filtroEstado, filtroTipoViaje, filtroConductor, filtroUsuario]);
 
// Función para cargar viajes desde Firestore - CORREGIDA
const cargarViajes = async () => {
  try {
    // Convertir fechas a timestamps para la consulta de Firestore
    const timestampInicio = Timestamp.fromDate(fechaInicio);
    const timestampFin = Timestamp.fromDate(fechaFin);
   
    // Crear consulta base - ahora usando fecha_creacion que es el campo correcto
    let viajesQuery = query(
      collection(db, 'viajes'),
      where('fecha_creacion', '>=', timestampInicio),
      where('fecha_creacion', '<=', timestampFin),
      orderBy('fecha_creacion', 'desc')
    );
   
    // Aplicar filtros adicionales si están seleccionados
    if (filtroEstado !== 'todos') {
      viajesQuery = query(viajesQuery, where('estado', '==', filtroEstado));
    }
   
    if (filtroTipoViaje !== 'todos' && filtroTipoViaje !== '') {
      viajesQuery = query(viajesQuery, where('tipoViaje', '==', filtroTipoViaje));
    }
   
    if (filtroConductor !== '') {
      viajesQuery = query(viajesQuery, where('conductor_id', '==', filtroConductor));
    }
   
    if (filtroUsuario !== '') {
      viajesQuery = query(viajesQuery, where('cliente_id', '==', filtroUsuario));
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
      where('fecha_creacion', '>=', timestampInicio),
      where('fecha_creacion', '<=', timestampFin)
    );
   
    const totalSnapshot = await getDocs(totalQuery);
    setTotalItems(totalSnapshot.size);
   
    // Inicializar métricas para viajes
    const metricasTemp = {
      gananciaTotal: 0,
      viajesCompletados: 0,
      viajesCancelados: 0,
      distanciaTotal: 0,
      distanciaPromedio: 0,
      tarifaPromedio: 0,
      gananciaDiaria: {}
    };
    
    // Procesar datos de viajes
    const viajes = [];
    for (const docSnapshot of viajesSnapshot.docs) {
      const viajeData = docSnapshot.data();
      
      // Usar nombres de campos correctos según Firestore
      const nombreConductor = viajeData.conductor_nombre || 'Desconocido';
      const nombreCliente = viajeData.cliente_nombre || 'Desconocido';
      
      // Formatear fechas para visualización
      const fechaCreacion = viajeData.fecha_creacion ? formatDate(viajeData.fecha_creacion) : 'Fecha desconocida';
      const fechaInicio = viajeData.fecha_inicio ? formatDate(viajeData.fecha_inicio) : '';
      
      // Obtener coordenadas de origen/destino
      const origen = `${viajeData.origen_lat || 0}, ${viajeData.origen_lng || 0}`;
      const destino = `${viajeData.destino_lat || 0}, ${viajeData.destino_lng || 0}`;
      
      // CORREGIDO: Asegurarse de obtener la tarifa correctamente, con fallback a 0 si no existe
      const precio = parseFloat(viajeData.tarifa) || 0;
      const distancia = parseFloat(viajeData.distancia_km) || 0;
      
      // Calcular o usar duración existente
      let duracion = viajeData.tiempo_estimado || 0;
      
      // Actualizar métricas
      if (viajeData.estado === 'completado') {
        metricasTemp.viajesCompletados++;
        metricasTemp.gananciaTotal += precio;
        metricasTemp.distanciaTotal += distancia;
        
        // Agrupar ganancias por día
        const fechaSolo = fechaCreacion.split(' ')[0]; // Extraer solo la fecha
        if (!metricasTemp.gananciaDiaria[fechaSolo]) {
          metricasTemp.gananciaDiaria[fechaSolo] = 0;
        }
        metricasTemp.gananciaDiaria[fechaSolo] += precio;
      } else if (viajeData.estado === 'cancelado') {
        metricasTemp.viajesCancelados++;
      }
      
      // Crear objeto para cada viaje
      viajes.push({
        id: docSnapshot.id,
        fecha: fechaCreacion,
        fecha_inicio: fechaInicio,
        origen,
        destino,
        estado: viajeData.estado || 'desconocido',
        conductor: nombreConductor,
        conductor_id: viajeData.conductor_id || '',
        cliente: nombreCliente,
        cliente_id: viajeData.cliente_id || '',
        precio,
        distancia,
        duracion,
        calificacion: viajeData.calificacion || 0,
        tipoViaje: viajeData.tipoViaje || 'estándar',
        raw: viajeData // Mantener datos originales para uso posterior
      });
    }
    
    // Completar cálculos de métricas
    if (metricasTemp.viajesCompletados > 0) {
      metricasTemp.distanciaPromedio = metricasTemp.distanciaTotal / metricasTemp.viajesCompletados;
      metricasTemp.tarifaPromedio = metricasTemp.gananciaTotal / metricasTemp.viajesCompletados;
    }
    
    // Actualizar estados
    setViajesData(viajes);
    setMetricasViajes(metricasTemp);
    
    // Preparar datos para gráficos
    prepararDatosGraficosViajes(viajes, metricasTemp.gananciaDiaria);
  } catch (error) {
    console.error("Error al cargar viajes:", error);
    throw error;
  }
};

// Función para preparar datos de gráficos de viajes - CORREGIDA
const prepararDatosGraficosViajes = (viajes, gananciaDiaria) => {
  try {
    // Inicializar objeto para agrupar viajes por día
    const viajesPorDia = {};
    
    // Procesar cada viaje para agruparlos por día
    viajes.forEach(viaje => {
      // Extraer solo la fecha (sin hora)
      const fechaSolo = viaje.fecha.split(' ')[0];
      
      // Inicializar contadores si no existen para esta fecha
      if (!viajesPorDia[fechaSolo]) {
        viajesPorDia[fechaSolo] = {
          viajes: 0,
          ganancias: 0,
          distancia: 0
        };
      }
      
      // Incrementar contador de viajes
      viajesPorDia[fechaSolo].viajes++;
      
      // Acumular ganancias y distancias solo para viajes completados
      if (viaje.estado === 'completado') {
        // CORREGIDO: Asegurarse de que estamos operando con números
        viajesPorDia[fechaSolo].ganancias += parseFloat(viaje.precio) || 0;
        viajesPorDia[fechaSolo].distancia += parseFloat(viaje.distancia) || 0;
      }
    });
    
    // Convertir a formato para gráficos
    const datosGrafico = Object.keys(viajesPorDia).map(fecha => ({
      fecha,
      viajes: viajesPorDia[fecha].viajes,
      ganancias: viajesPorDia[fecha].ganancias,
      distancia: viajesPorDia[fecha].distancia
    }));
    
    // Ordenar por fecha
    datosGrafico.sort((a, b) => {
      // Convertir fechas en formato DD/MM/YYYY a objetos Date
      const partsA = a.fecha.split('/');
      const partsB = b.fecha.split('/');
      
      // Formato correcto para Date: año, mes (0-11), día
      const dateA = new Date(partsA[2], partsA[1]-1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1]-1, partsB[0]);
      
      return dateA - dateB;
    });
    
    // Actualizar datos para gráficos
    setViajesDataGrafico(datosGrafico);
    
    // Calcular totales para actualizar métricas
    let gananciaTotal = 0;
    let distanciaTotal = 0;
    let viajesCompletados = 0;
    let viajesCancelados = 0;
    
    viajes.forEach(viaje => {
      if (viaje.estado === 'completado') {
        gananciaTotal += parseFloat(viaje.precio) || 0;
        distanciaTotal += parseFloat(viaje.distancia) || 0;
        viajesCompletados++;
      } else if (viaje.estado === 'cancelado') {
        viajesCancelados++;
      }
    });
    
    // Actualizar métricas con los valores calculados
    setMetricasViajes(prevMetricas => ({
      ...prevMetricas,
      gananciaTotal,
      distanciaTotal,
      distanciaPromedio: viajesCompletados > 0 ? distanciaTotal / viajesCompletados : 0,
      tarifaPromedio: viajesCompletados > 0 ? gananciaTotal / viajesCompletados : 0,
      viajesCompletados,
      viajesCancelados
    }));
  } catch (error) {
    console.error("Error al preparar datos para gráficos:", error);
    setViajesDataGrafico([]);
  }
};
 
  // Función para cargar conductores desde Firestore
  const cargarConductores = async () => {
    try {
      // Crear consulta base
      let conductoresQuery = query(
        collection(db, 'conductores'),
        orderBy('fecha_registro', 'desc')
      );
      
      // Aplicar paginación
      if (ultimoDocumento && paginaActual > 1) {
        conductoresQuery = query(conductoresQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
      } else {
        conductoresQuery = query(conductoresQuery, limit(itemsPorPagina));
      }
      
      const conductoresSnapshot = await getDocs(conductoresQuery);
      
      // Guardar documentos para paginación
      if (!conductoresSnapshot.empty) {
        setUltimoDocumento(conductoresSnapshot.docs[conductoresSnapshot.docs.length - 1]);
        setPrimerDocumento(conductoresSnapshot.docs[0]);
      } else {
        setUltimoDocumento(null);
        setPrimerDocumento(null);
      }
      
      // Obtener total de conductores
      const totalQuery = query(collection(db, 'conductores'));
      const totalSnapshot = await getDocs(totalQuery);
      setTotalItems(totalSnapshot.size);
      
      // Inicializar métricas de conductores
      const metricasTemp = {
        activos: 0,
        inactivos: 0,
        totalViajes: 0,
        calificacionPromedio: 0,
        totalCalificaciones: 0,
        conductoresCalificados: 0
      };
      
      const conductores = [];
      for (const docSnapshot of conductoresSnapshot.docs) {
        const conductorData = docSnapshot.data();
        
        // Procesar el estado del conductor
        const estaActivo = conductorData.estado === 'activo' || conductorData.activo === true;
        
        // Actualizar métricas
        if (estaActivo) {
          metricasTemp.activos++;
        } else {
          metricasTemp.inactivos++;
        }
        
        metricasTemp.totalViajes += conductorData.viajes_completados || conductorData.viajesRealizados || 0;
        
        // Acumular calificaciones para promedio
        if (conductorData.calificacion_promedio > 0 || conductorData.calificacionPromedio > 0) {
          metricasTemp.totalCalificaciones += conductorData.calificacion_promedio || conductorData.calificacionPromedio || 0;
          metricasTemp.conductoresCalificados++;
        }
        
        // Crear objeto para cada conductor
        conductores.push({
          id: docSnapshot.id,
          nombre: conductorData.nombre || 'Sin nombre',
          email: conductorData.email || 'Sin email',
          telefono: conductorData.telefono || 'Sin teléfono',
          licencia: conductorData.licencia || conductorData.licenciaURL || 'Sin licencia',
          licencia_categoria: conductorData.licencia_categoria || 'No especificada',
          fechaRegistro: conductorData.fecha_registro ? formatDate(conductorData.fecha_registro) : 
                      conductorData.fechaRegistro ? formatDate(conductorData.fechaRegistro) : 'Desconocida',
          estado: estaActivo ? 'activo' : 'inactivo',
          viajesRealizados: conductorData.viajes_completados || conductorData.viajesRealizados || 0,
          calificacionPromedio: conductorData.calificacion_promedio || conductorData.calificacionPromedio || 0,
          modelo_vehiculo: conductorData.modelo_vehiculo || 'No especificado',
          placa_vehiculo: conductorData.placa_vehiculo || 'No especificada'
        });
      }
      
      // Calcular promedio general de calificaciones
      if (metricasTemp.conductoresCalificados > 0) {
        metricasTemp.calificacionPromedio = metricasTemp.totalCalificaciones / metricasTemp.conductoresCalificados;
      }
      
      setConductoresData(conductores);
      setMetricasConductores(metricasTemp);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
      throw error;
    }
  };

  // Función para cargar solicitudes de conductores
  const cargarSolicitudes = async () => {
    try {
      // Crear consulta base
      let solicitudesQuery = query(
        collection(db, 'solicitudes_conductores'),
        orderBy('fecha_solicitud', 'desc')
      );
      
      // Aplicar filtros de fecha si están seleccionados
      if (fechaInicio && fechaFin) {
        const timestampInicio = Timestamp.fromDate(fechaInicio);
        const timestampFin = Timestamp.fromDate(fechaFin);
        
        solicitudesQuery = query(
          solicitudesQuery,
          where('fecha_solicitud', '>=', timestampInicio),
          where('fecha_solicitud', '<=', timestampFin)
        );
      }
      
      // Aplicar paginación
      if (ultimoDocumento && paginaActual > 1) {
        solicitudesQuery = query(solicitudesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
      } else {
        solicitudesQuery = query(solicitudesQuery, limit(itemsPorPagina));
      }
      
      const solicitudesSnapshot = await getDocs(solicitudesQuery);
      
      // Guardar documentos para paginación
      if (!solicitudesSnapshot.empty) {
        setUltimoDocumento(solicitudesSnapshot.docs[solicitudesSnapshot.docs.length - 1]);
        setPrimerDocumento(solicitudesSnapshot.docs[0]);
      } else {
        setUltimoDocumento(null);
        setPrimerDocumento(null);
      }
      
      // Obtener total de solicitudes
      const totalQuery = query(collection(db, 'solicitudes_conductores'));
      const totalSnapshot = await getDocs(totalQuery);
      setTotalItems(totalSnapshot.size);
      
      // Inicializar métricas
      const metricasTemp = {
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
        tiempoPromedioAprobacion: 0,
        totalTiempoAprobacion: 0,
        solicitudesConTiempo: 0
      };
      
      const solicitudes = [];
      for (const docSnapshot of solicitudesSnapshot.docs) {
        const solicitudData = docSnapshot.data();
        
        // Determinar estado
        let estado = solicitudData.estado || 'pendiente';
        if (typeof estado === 'string') {
          estado = estado.toLowerCase();
        }
        
        // Actualizar métricas
        if (estado === 'pendiente') {
          metricasTemp.pendientes++;
        } else if (estado === 'aprobada' || estado === 'aprobado') {
          metricasTemp.aprobadas++;
          
          // Calcular tiempo de aprobación si hay fecha de aprobación
          if (solicitudData.fecha_aprobacion && solicitudData.fecha_solicitud) {
            const fechaSolicitud = solicitudData.fecha_solicitud.toDate ? 
                                solicitudData.fecha_solicitud.toDate() : 
                                new Date(solicitudData.fecha_solicitud);
            const fechaAprobacion = solicitudData.fecha_aprobacion.toDate ? 
                                 solicitudData.fecha_aprobacion.toDate() : 
                                 new Date(solicitudData.fecha_aprobacion);
            
            const tiempoEnHoras = (fechaAprobacion - fechaSolicitud) / (1000 * 60 * 60);
            
            metricasTemp.totalTiempoAprobacion += tiempoEnHoras;
            metricasTemp.solicitudesConTiempo++;
          }
        } else if (estado === 'rechazada' || estado === 'rechazado') {
          metricasTemp.rechazadas++;
        }
        
        // Crear objeto para cada solicitud
        solicitudes.push({
          id: docSnapshot.id,
          nombre: solicitudData.nombre || 'Sin nombre',
          email: solicitudData.email || 'Sin email',
          telefono: solicitudData.telefono || 'Sin teléfono',
          licencia: solicitudData.licencia || 'Sin licencia',
          licencia_categoria: solicitudData.licencia_categoria || 'No especificada',
          fechaSolicitud: solicitudData.fecha_solicitud ? formatDate(solicitudData.fecha_solicitud) : 'Desconocida',
          estado: estado,
          documentosCompletos: solicitudData.documentosCompletos || false,
          fecha_aprobacion: solicitudData.fecha_aprobacion ? formatDate(solicitudData.fecha_aprobacion) : 'No aprobada',
          modelo_vehiculo: solicitudData.modelo_vehiculo || 'No especificado',
          placa_vehiculo: solicitudData.placa_vehiculo || 'No especificada'
        });
      }
      
      // Calcular tiempo promedio de aprobación
      if (metricasTemp.solicitudesConTiempo > 0) {
        metricasTemp.tiempoPromedioAprobacion = metricasTemp.totalTiempoAprobacion / metricasTemp.solicitudesConTiempo;
      }
      
      // Actualizar estados
      setSolicitudesData(solicitudes);
      setMetricasSolicitudes(metricasTemp);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      throw error;
    }
  };
 
  const cargarAdministradores = async () => {
    try {
      // Consulta para administradores (usuarios con rol admin)
      let adminsQuery = query(
        collection(db, 'usuarios'),
        where('role', '==', 'admin')
      );
      
      // Aplicar paginación
      if (ultimoDocumento && paginaActual > 1) {
        adminsQuery = query(adminsQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
      } else {
        adminsQuery = query(adminsQuery, limit(itemsPorPagina));
      }
      
      const adminsSnapshot = await getDocs(adminsQuery);
      
      // Guardar documentos para paginación
      if (!adminsSnapshot.empty) {
        setUltimoDocumento(adminsSnapshot.docs[adminsSnapshot.docs.length - 1]);
        setPrimerDocumento(adminsSnapshot.docs[0]);
      } else {
        setUltimoDocumento(null);
        setPrimerDocumento(null);
      }
      
      // Obtener total de administradores
      const totalQuery = query(
        collection(db, 'usuarios'),
        where('role', '==', 'admin')
      );
      const totalSnapshot = await getDocs(totalQuery);
      setTotalItems(totalSnapshot.size);
      
      const administradores = [];
      for (const docSnapshot of adminsSnapshot.docs) {
        const adminData = docSnapshot.data();
        administradores.push({
          id: docSnapshot.id,
          nombre: adminData.nombre || 'Administrador',
          email: adminData.email || 'Sin email',
          rol: adminData.role || 'admin',
          fechaRegistro: adminData.fechaRegistro ? formatDate(adminData.fechaRegistro) : 'Desconocida',
          ultimoAcceso: adminData.ultimoAcceso ? formatDate(adminData.ultimoAcceso) : 'Nunca',
          accionesRealizadas: adminData.accionesRealizadas || 0,
          active: adminData.active || true,
          uid: adminData.uid || ''
        });
      }
      
      setAdministradoresData(administradores);
    } catch (error) {
      console.error("Error al cargar administradores:", error);
      throw error;
    }
  };
 
  const cargarGrabaciones = async () => {
    try {
      // Crear consulta base
      let grabacionesQuery = query(
        collection(db, 'grabaciones'),
        orderBy('fecha', 'desc')
      );
      
      // Aplicar paginación
      if (ultimoDocumento && paginaActual > 1) {
        grabacionesQuery = query(grabacionesQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
      } else {
        grabacionesQuery = query(grabacionesQuery, limit(itemsPorPagina));
      }
      
      const grabacionesSnapshot = await getDocs(grabacionesQuery);
      
      // Guardar documentos para paginación
      if (!grabacionesSnapshot.empty) {
        setUltimoDocumento(grabacionesSnapshot.docs[grabacionesSnapshot.docs.length - 1]);
        setPrimerDocumento(grabacionesSnapshot.docs[0]);
      } else {
        setUltimoDocumento(null);
        setPrimerDocumento(null);
      }
      
      // Obtener total de grabaciones
      const totalQuery = query(collection(db, 'grabaciones'));
      const totalSnapshot = await getDocs(totalQuery);
      setTotalItems(totalSnapshot.size);
      
      const grabaciones = [];
      for (const docSnapshot of grabacionesSnapshot.docs) {
        const grabacionData = docSnapshot.data();
        grabaciones.push({
          id: docSnapshot.id,
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
   } catch (error) {
     console.error("Error al cargar grabaciones:", error);
     throw error;
   }
 };

 const cargarLogs = async () => {
   try {
     // Consulta a Firestore para cargar logs con paginación
     let logsQuery = query(
       collection(db, 'logs'),
       orderBy('fecha', 'desc')
     );
     
     // Aplicar filtros de fecha si están seleccionados
     if (fechaInicio && fechaFin) {
       const timestampInicio = Timestamp.fromDate(fechaInicio);
       const timestampFin = Timestamp.fromDate(fechaFin);
       logsQuery = query(
         logsQuery,
         where('fecha', '>=', timestampInicio),
         where('fecha', '<=', timestampFin)
       );
     }
     
     // Aplicar paginación
     if (ultimoDocumento && paginaActual > 1) {
       logsQuery = query(logsQuery, startAfter(ultimoDocumento), limit(itemsPorPagina));
     } else {
       logsQuery = query(logsQuery, limit(itemsPorPagina));
     }
     
     const logsSnapshot = await getDocs(logsQuery);
     
     // Guardar documentos para paginación
     if (!logsSnapshot.empty) {
       setUltimoDocumento(logsSnapshot.docs[logsSnapshot.docs.length - 1]);
       setPrimerDocumento(logsSnapshot.docs[0]);
     } else {
       setUltimoDocumento(null);
       setPrimerDocumento(null);
     }
     
     // Obtener total de logs
     const totalQuery = query(collection(db, 'logs'));
     const totalSnapshot = await getDocs(totalQuery);
     setTotalItems(totalSnapshot.size);
     
     const logs = [];
     for (const docSnapshot of logsSnapshot.docs) {
       const logData = docSnapshot.data();
       
       // Obtener nombre de usuario en lugar de mostrar el ID (si está disponible)
       let usuarioNombre = 'Sistema';
       if (logData.usuarioId && logData.usuarioId !== 'Sistema') {
         try {
           const usuarioDoc = await getDoc(doc(db, 'usuarios', logData.usuarioId));
           if (usuarioDoc.exists()) {
             usuarioNombre = usuarioDoc.data().nombre || 'Usuario';
           }
         } catch (err) {
           console.error("Error al obtener nombre de usuario:", err);
         }
       }
       
       logs.push({
         id: docSnapshot.id,
         fecha: logData.fecha ? formatDate(logData.fecha) : 'Desconocida',
         usuario: usuarioNombre, // Mostrar nombre en lugar de ID
         accion: logData.accion ? logData.accion.replace(/_/g, ' ') : 'desconocida',
         detalles: logData.detalles || 'Sin detalles',
         modulo: logData.modulo || 'general',
         resultado: logData.resultado || 'completado'
       });
     }
     
     setLogsData(logs);
   } catch (error) {
     console.error("Error al cargar logs:", error);
     throw error;
   }
 };

 // Función para configurar datos de demostración si falla la carga real
 const configurarDatosDemostracion = () => {
   switch(activeTab) {
     case 'viajes':
       // Datos de viajes con métricas de negocio
       const viajesDemo = [
         { id: '1', fecha: '20/04/2023 15:30', origen: 'Centro Comercial', destino: 'Aeropuerto', estado: 'completado', conductor: 'Dilan Cimar', cliente: 'Cliente', precio: 150, distancia: 12.5, duracion: 28, calificacion: 5, tipoViaje: 'ejecutivo' },
         { id: '2', fecha: '20/04/2023 14:00', origen: 'Plaza Principal', destino: 'Universidad Nacional', estado: 'completado', conductor: 'Roberto Méndez', cliente: 'María González', precio: 85, distancia: 8.2, duracion: 15, calificacion: 4, tipoViaje: 'estándar' },
         { id: '3', fecha: '20/04/2023 12:30', origen: 'Hospital Central', destino: 'Residencial Los Pinos', estado: 'completado', conductor: 'Miguel Torres', cliente: 'Carlos Rodríguez', precio: 70, distancia: 6.8, duracion: 18, calificacion: 4, tipoViaje: 'estándar' },
         { id: '4', fecha: '19/04/2023 18:45', origen: 'Estadio Municipal', destino: 'Hotel Central', estado: 'cancelado', conductor: 'Dilan Cimar', cliente: 'Laura Pérez', precio: 0, distancia: 0, duracion: 0, calificacion: 0, tipoViaje: 'estándar' },
         { id: '5', fecha: '19/04/2023 16:20', origen: 'Parque Industrial', destino: 'Terminal Terrestre', estado: 'completado', conductor: 'Ana Martínez', cliente: 'Fernando Gómez', precio: 95, distancia: 10.2, duracion: 22, calificacion: 5, tipoViaje: 'ejecutivo' }
       ];
       
       setViajesData(viajesDemo);
       
       // Métricas para viajes
       const metricasViajesDemo = {
         gananciaTotal: 400,
         viajesCompletados: 4,
         viajesCancelados: 1,
         distanciaTotal: 37.7,
         distanciaPromedio: 9.42,
         tarifaPromedio: 100,
         gananciaDiaria: {
           '20/04/2023': 305,
           '19/04/2023': 95
         }
       };
       
       setMetricasViajes(metricasViajesDemo);
       
       // Preparar datos para gráficos
       prepararDatosGraficosViajes(viajesDemo, metricasViajesDemo.gananciaDiaria);
       break;
       
     case 'conductores':
       setConductoresData([
         { id: '1', nombre: 'Dilan Cimar', email: 'cimardilan@gmail.com', telefono: '78795918', licencia: 'B', fechaRegistro: '09/04/2025', estado: 'activo', viajesRealizados: 0, calificacionPromedio: 0, modelo_vehiculo: 'Audi', placa_vehiculo: '1233djh' },
         { id: '2', nombre: 'Roberto Méndez', email: 'roberto@example.com', telefono: '555-2345', licencia: 'ABC123', fechaRegistro: '01/02/2023', estado: 'activo', viajesRealizados: 45, calificacionPromedio: 4.7, modelo_vehiculo: 'Toyota Corolla', placa_vehiculo: 'ABC-123' },
         { id: '3', nombre: 'Ana Martínez', email: 'ana@example.com', telefono: '555-6789', licencia: 'DEF456', fechaRegistro: '15/02/2023', estado: 'activo', viajesRealizados: 38, calificacionPromedio: 4.5, modelo_vehiculo: 'Hyundai Accent', placa_vehiculo: 'DEF-456' },
         { id: '4', nombre: 'Miguel Torres', email: 'miguel@example.com', telefono: '555-0123', licencia: 'GHI789', fechaRegistro: '10/03/2023', estado: 'inactivo', viajesRealizados: 12, calificacionPromedio: 3.8, modelo_vehiculo: 'Kia Rio', placa_vehiculo: 'GHI-789' }
       ]);
       
       // Métricas para conductores
       setMetricasConductores({
         activos: 3,
         inactivos: 1,
         totalViajes: 95,
         calificacionPromedio: 4.33
       });
       break;
       
     case 'solicitudes':
       setSolicitudesData([
         { id: '1', nombre: 'Dilan Cimar Choque Nina', email: '2002dilanchoque@gmail.com', telefono: '78795918', licencia: 'B', licencia_categoria: 'B', fechaSolicitud: '09/04/2025 9:34:06 a.m.', estado: 'aprobado', documentosCompletos: true, fecha_aprobacion: '09/04/2025 9:34:47 a.m.', modelo_vehiculo: 'toyota', placa_vehiculo: '1234dfa' },
         { id: '2', nombre: 'Dilan Cimar', email: 'flaquito@gmail.com', telefono: '123654', licencia: 'Lic12345', fechaSolicitud: '10/04/2023', estado: 'pendiente', documentosCompletos: true, modelo_vehiculo: 'Ford Focus', placa_vehiculo: 'XYZ-789' },
         { id: '3', nombre: 'Elena Vargas', email: 'elena@example.com', telefono: '555-3456', licencia: 'Q67890', fechaSolicitud: '08/04/2023', estado: 'aprobada', documentosCompletos: true, fecha_aprobacion: '10/04/2023', modelo_vehiculo: 'Chevrolet Sail', placa_vehiculo: 'DEF-123' },
         { id: '4', nombre: 'Javier Rojas', email: 'javier@example.com', telefono: '555-7890', licencia: 'R12345', fechaSolicitud: '12/04/2023', estado: 'rechazada', documentosCompletos: false, modelo_vehiculo: 'Nissan Versa', placa_vehiculo: 'GHI-456' }
       ]);
       
       // Métricas para solicitudes
       setMetricasSolicitudes({
         pendientes: 1,
         aprobadas: 2,
         rechazadas: 1,
         tiempoPromedioAprobacion: 24
       });
       break;
       
     case 'admins':
       setAdministradoresData([
         { id: '1', nombre: 'Administrador', email: 'ded@gmail.com', rol: 'admin', fechaRegistro: '01/01/2023', ultimoAcceso: '20/04/2023', accionesRealizadas: 120, active: true, uid: 'iiV7ftV4LiMWXLNrDppNn67lzJS2' },
         { id: '2', nombre: 'Gabriela Rodriguez', email: 'gabriela@example.com', rol: 'admin', fechaRegistro: '15/01/2023', ultimoAcceso: '19/04/2023', accionesRealizadas: 85, active: true },
         { id: '3', nombre: 'Daniel Morales', email: 'daniel@example.com', rol: 'supervisor', fechaRegistro: '01/02/2023', ultimoAcceso: '20/04/2023', accionesRealizadas: 64, active: true }
       ]);
       break;
       
     case 'grabaciones':
       setGrabacionesData([
         { id: '1', viajeId: 'V123', conductorId: 'C1', fecha: '20/04/2023 14:30', duracion: '25:12', tamaño: '128 MB', estado: 'disponible', visualizaciones: 2 },
         { id: '2', viajeId: 'V124', conductorId: 'C2', fecha: '20/04/2023 10:15', duracion: '18:45', tamaño: '95 MB', estado: 'disponible', visualizaciones: 0 },
         { id: '3', viajeId: 'V125', conductorId: 'C1', fecha: '19/04/2023 18:22', duracion: '32:08', tamaño: '164 MB', estado: 'disponible', visualizaciones: 1 }
       ]);
       break;
       
     case 'logs':
       setLogsData([
         { id: '1', fecha: '20/04/2023 15:45:23', usuario: 'Administrador', accion: 'inicio sesion', detalles: 'Inicio de sesión exitoso', modulo: 'autenticación', resultado: 'exitoso' },
         { id: '2', fecha: '20/04/2023 15:30:15', usuario: 'Ana Martínez', accion: 'actualizar perfil', detalles: 'Actualización de datos de contacto', modulo: 'usuarios', resultado: 'exitoso' },
         { id: '3', fecha: '20/04/2023 14:22:08', usuario: 'Administrador', accion: 'aprobar solicitud', detalles: 'Aprobación de solicitud de conductor #S123', modulo: 'solicitudes', resultado: 'exitoso' }
       ]);
       break;
       
     default:
       // No hacer nada
       break;
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
       fileName = `viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.csv`;
       break;
     case 'conductores':
       dataToExport = conductoresData;
       fileName = `conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
       break;
     case 'solicitudes':
       dataToExport = solicitudesData;
       fileName = `solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
       break;
     case 'admins':
       dataToExport = administradoresData;
       fileName = `administradores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
       break;
     case 'grabaciones':
       dataToExport = grabacionesData;
       fileName = `grabaciones_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
       break;
     case 'logs':
       dataToExport = logsData;
       fileName = `logs_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
       break;
     default:
       alert('No hay datos para exportar');
       return;
   }
  
   // Preparar los datos para exportación según la categoría
   let dataPreparada = [];
   
   switch(activeTab) {
     case 'viajes':
       dataPreparada = dataToExport.map(item => ({
         Fecha: item.fecha,
         Origen: item.origen,
         Destino: item.destino,
         Estado: item.estado,
         Conductor: item.conductor,
         Cliente: item.cliente,
         Precio: item.precio,
         'Distancia (km)': item.distancia,
         'Duración (min)': item.duracion,
         Calificación: item.calificacion,
         'Tipo de Viaje': item.tipoViaje
       }));
       break;
     case 'conductores':
       dataPreparada = dataToExport.map(item => ({
         Nombre: item.nombre,
         Email: item.email,
         Teléfono: item.telefono,
         Licencia: item.licencia,
         'Categoría Licencia': item.licencia_categoria,
         'Fecha Registro': item.fechaRegistro,
         Estado: item.estado,
         'Viajes Realizados': item.viajesRealizados,
         'Calificación Promedio': item.calificacionPromedio,
         'Modelo Vehículo': item.modelo_vehiculo,
         'Placa Vehículo': item.placa_vehiculo
       }));
       break;
     case 'solicitudes':
       dataPreparada = dataToExport.map(item => ({
         Nombre: item.nombre,
         Email: item.email,
         Teléfono: item.telefono,
         Licencia: item.licencia,
         'Categoría Licencia': item.licencia_categoria,
         'Fecha Solicitud': item.fechaSolicitud,
         Estado: item.estado,
         'Documentos Completos': item.documentosCompletos ? 'Sí' : 'No',
         'Fecha Aprobación': item.fecha_aprobacion || 'N/A',
         'Modelo Vehículo': item.modelo_vehiculo,
         'Placa Vehículo': item.placa_vehiculo
       }));
       break;
     case 'logs':
       dataPreparada = dataToExport.map(item => ({
         Fecha: item.fecha,
         Usuario: item.usuario,
         Acción: item.accion,
         Módulo: item.modulo,
         Detalles: item.detalles,
         Resultado: item.resultado
       }));
       break;
     default:
       dataPreparada = dataToExport.map(item => {
         const itemLimpio = {...item};
         delete itemLimpio.raw;
         delete itemLimpio.id;
         return itemLimpio;
       });
   }
   
   // Configurar opciones del CSV basadas en el idioma
   const csvOptions = {
     delimiter: delimiter,
     header: true,
     quotes: true,  // Para manejar caracteres especiales
     quoteChar: '"',
     escapeChar: '"'
   };
  
   const csv = Papa.unparse(dataPreparada, csvOptions);
   
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

 // Función mejorada para exportar reportes a PDF
 const exportarPDF = () => {
   let dataToExport = [];
   let columns = [];
   let title = '';
   let subtitle = '';
   let fileName = '';
   let extraInfo = '';
  
   // Configurar datos según tipo de reporte
   switch(activeTab) {
     case 'viajes':
       dataToExport = viajesData.map(v => [
         v.fecha, 
         v.origen.length > 15 ? v.origen.substring(0, 15) + '...' : v.origen, 
         v.destino.length > 15 ? v.destino.substring(0, 15) + '...' : v.destino, 
         v.estado, 
         v.conductor, 
         v.cliente, 
         `${formatCurrency(v.precio)}`, 
         `${v.distancia.toFixed(1)} km`, 
         `${v.duracion} min`, 
         v.calificacion
       ]);
       columns = ['Fecha', 'Origen', 'Destino', 'Estado', 'Conductor', 'Cliente', 'Precio', 'Distancia', 'Duración', 'Cal.'];
       title = `Reporte de Viajes`;
       subtitle = `Período: ${formatDateShort(fechaInicio)} - ${formatDateShort(fechaFin)}`;
       fileName = `Viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.pdf`;
       
       // Añadir métricas para viajes
       extraInfo = `
         Métricas del Período:
         - Ganancia Total: ${formatCurrency(metricasViajes.gananciaTotal)}
         - Viajes Completados: ${metricasViajes.viajesCompletados}
         - Viajes Cancelados: ${metricasViajes.viajesCancelados}
         - Distancia Total: ${metricasViajes.distanciaTotal.toFixed(1)} km
         - Distancia Promedio: ${metricasViajes.distanciaPromedio.toFixed(1)} km
         - Tarifa Promedio: ${formatCurrency(metricasViajes.tarifaPromedio)}
       `;
       break;
       
     case 'conductores':
       dataToExport = conductoresData.map(c => [
         c.nombre, 
         c.email, 
         c.telefono, 
         c.licencia, 
         c.fechaRegistro, 
         c.estado, 
         c.viajesRealizados, 
         c.calificacionPromedio.toFixed(1),
         c.modelo_vehiculo,
         c.placa_vehiculo
       ]);
       columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Registro', 'Estado', 'Viajes', 'Cal.', 'Modelo', 'Placa'];
       title = 'Reporte de Conductores';
       subtitle = `Generado: ${formatDateShort(new Date())}`;
       fileName = `Conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
       
       // Métricas para conductores
       extraInfo = `
         Métricas de Conductores:
         - Conductores Activos: ${metricasConductores.activos}
         - Conductores Inactivos: ${metricasConductores.inactivos}
         - Total de Viajes Realizados: ${metricasConductores.totalViajes}
         - Calificación Promedio: ${metricasConductores.calificacionPromedio.toFixed(1)}
       `;
       break;
       
     case 'solicitudes':
       dataToExport = solicitudesData.map(s => [
         s.nombre, 
         s.email, 
         s.telefono, 
         s.licencia, 
         s.fechaSolicitud, 
         s.estado, 
         s.documentosCompletos ? 'Sí' : 'No',
         s.fecha_aprobacion || 'N/A',
         s.modelo_vehiculo
       ]);
       columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Fecha Solicitud', 'Estado', 'Docs.', 'Aprobación', 'Vehículo'];
       title = 'Reporte de Solicitudes';
       subtitle = `Generado: ${formatDateShort(new Date())}`;
       fileName = `Solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
       
       // Métricas para solicitudes
       extraInfo = `
         Métricas de Solicitudes:
         - Pendientes: ${metricasSolicitudes.pendientes}
         - Aprobadas: ${metricasSolicitudes.aprobadas}
         - Rechazadas: ${metricasSolicitudes.rechazadas}
         - Tiempo Promedio de Aprobación: ${metricasSolicitudes.tiempoPromedioAprobacion.toFixed(1)} horas
       `;
       break;
       
     case 'admins':
       dataToExport = administradoresData.map(a => [
         a.nombre, 
         a.email, 
         a.rol, 
         a.fechaRegistro, 
         a.ultimoAcceso, 
         a.accionesRealizadas,
         a.active ? 'Activo' : 'Inactivo'
       ]);
       columns = ['Nombre', 'Email', 'Rol', 'Registro', 'Último Acceso', 'Acciones', 'Estado'];
       title = 'Reporte de Administradores';
       subtitle = `Generado: ${formatDateShort(new Date())}`;
       fileName = `Administradores_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
       break;
       
     case 'grabaciones':
       dataToExport = grabacionesData.map(g => [
         g.viajeId, 
         g.conductorId, 
         g.fecha, 
         g.duracion, 
         g.tamaño, 
         g.estado, 
         g.visualizaciones
       ]);
       columns = ['ID Viaje', 'ID Conductor', 'Fecha', 'Duración', 'Tamaño', 'Estado', 'Vistas'];
       title = 'Reporte de Grabaciones';
       subtitle = `Generado: ${formatDateShort(new Date())}`;
       fileName = `Grabaciones_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
       break;
       
     case 'logs':
       dataToExport = logsData.map(l => [
         l.fecha, 
         l.usuario,
         l.accion, 
         l.detalles.length > 25 ? l.detalles.substring(0, 25) + '...' : l.detalles, 
         l.modulo, 
         l.resultado
       ]);
       columns = ['Fecha', 'Usuario', 'Acción', 'Detalles', 'Módulo', 'Resultado'];
       title = 'Reporte de Logs del Sistema';
       subtitle = `Generado: ${formatDateShort(new Date())}`;
       fileName = `Logs_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
       break;
       
     default:
       alert('No hay datos para exportar');
       return;
   }
   
   try {
     // Crear PDF con soporte para caracteres acentuados
     const doc = new jsPDF({
       orientation: activeTab === 'viajes' ? 'landscape' : (dataToExport[0] && dataToExport[0].length > 5 ? 'landscape' : 'portrait'),
       unit: 'mm',
       format: 'a4'
     });
     
     // Añadir la fuente Helvetica que soporta caracteres especiales
     doc.setFont('helvetica');
     
     // Definir dimensiones y márgenes
     const pageWidth = doc.internal.pageSize.getWidth();
     const pageHeight = doc.internal.pageSize.getHeight();
     const margin = 15;
     
     // Cargar imagen del logo y agregarla
     const logoWidth = 40;
     const logoHeight = 20;
     
     // Agregar logo empresarial en esquina superior izquierda
     try {
       doc.addImage(logoUrl, 'PNG', margin, margin, logoWidth, logoHeight);
     } catch (error) {
       console.error("Error al cargar el logo:", error);
       // Si falla la carga del logo, continuar sin él
     }
     
     // Información de cabecera
     // Título principal
     doc.setFontSize(18);
     doc.setTextColor(0, 47, 108); // Azul corporativo oscuro
     doc.text(title, pageWidth / 2, margin + 10, { align: 'center' });
     
     // Subtítulo (período o fecha de generación)
     doc.setFontSize(12);
     doc.setTextColor(80, 80, 80); // Gris oscuro
     doc.text(subtitle, pageWidth / 2, margin + 20, { align: 'center' });
     
     // Información de la empresa
     doc.setFontSize(9);
     doc.setTextColor(100, 100, 100); // Gris medio
     doc.text('Viaje Seguro - Sistema de Reportes', pageWidth - margin, margin + 5, { align: 'right' });
     doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, pageWidth - margin, margin + 10, { align: 'right' });
     
     // Línea divisoria
     doc.setDrawColor(0, 175, 135); // Verde corporativo
     doc.setLineWidth(0.5);
     doc.line(margin, margin + 25, pageWidth - margin, margin + 25);
     
     // Configurar opciones específicas para AutoTable
     const tableOptions = {
       head: [columns],
       body: dataToExport,
       startY: margin + 30,
       margin: { left: margin, right: margin },
       styles: { 
         fontSize: 8, 
         cellPadding: 3,
         font: 'helvetica', // Asegurar que se use la fuente correcta
         overflow: 'linebreak'
       },
       headStyles: { 
         fillColor: [0, 175, 135], // Verde corporativo
         textColor: [255, 255, 255],
         fontStyle: 'bold'
       },
       alternateRowStyles: {
         fillColor: [245, 245, 245] // Gris muy claro para filas alternas
       },
       // Estas opciones mejoran la apariencia y el manejo de caracteres especiales
       didDrawPage: (data) => {
         // Agregar pie de página
         const footerText = `© ${new Date().getFullYear()} Viaje Seguro - Página ${data.pageNumber} de ${data.pageCount}`;
         doc.setFontSize(8);
         doc.setTextColor(150, 150, 150);
         doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
       }
     };
     
    // Añadir tabla al PDF
    doc.autoTable(tableOptions);
     
    // Si hay muchos datos, agregar resumen estadístico al final
    if (dataToExport.length > 0) {
      const finalY = doc.lastAutoTable.finalY || margin + 35;
      
      if (finalY + 50 < pageHeight - margin && extraInfo) {
        // Agregar línea divisoria
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, finalY + 10, pageWidth - margin, finalY + 10);
        
        // Agregar resumen según tipo de reporte
        doc.setFontSize(11);
        doc.setTextColor(0, 47, 108);
        doc.text("Resumen del reporte", margin, finalY + 20);
        
        // Agregar métricas de negocio
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        // Formatear y agregar extraInfo separando cada línea
        const extraInfoLines = extraInfo.split('\n').filter(line => line.trim() !== '');
        let yPos = finalY + 30;
        
        extraInfoLines.forEach(line => {
          doc.text(line.trim(), margin, yPos);
          yPos += 5;
        });
        
        // Agregar información específica según el tipo de reporte
        switch(activeTab) {
          case 'viajes':
            // Desglose de ganancias si hay más de 2 días con datos
            if (Object.keys(metricasViajes.gananciaDiaria).length > 2) {
              yPos += 5;
              doc.text('Desglose de Ganancias por Día (Top 5):', margin, yPos);
              yPos += 5;
              
              Object.entries(metricasViajes.gananciaDiaria)
                .sort((a, b) => b[1] - a[1]) // Ordenar por ganancia (mayor a menor)
                .slice(0, 5) // Tomar los 5 mejores días
                .forEach(([fecha, ganancia]) => {
                  doc.text(`${fecha}: ${formatCurrency(ganancia)}`, margin + 5, yPos);
                  yPos += 5;
                });
            }
            break;
            
          case 'conductores':
            // Top conductores por calificación
            const conductoresTop = [...conductoresData]
              .filter(c => c.calificacionPromedio > 0)
              .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
              .slice(0, 3);
              
            if (conductoresTop.length > 0) {
              yPos += 5;
              doc.text('Top Conductores por Calificación:', margin, yPos);
              yPos += 5;
              
              conductoresTop.forEach((c, index) => {
                doc.text(`${index + 1}. ${c.nombre}: ${c.calificacionPromedio.toFixed(1)} ★ (${c.viajesRealizados} viajes)`, margin + 5, yPos);
                yPos += 5;
              });
            }
            break;
        }
      }
    }
    
    // Guardar PDF
    doc.save(fileName);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Error al generar el PDF. Intente nuevamente.");
  }
};

// Función para renderizar métricas de negocio según la pestaña
const renderMetricasNegocio = () => {
  switch(activeTab) {
    case 'viajes':
      return (
        <div className="metricas-container">
          <h3>Métricas de Viajes</h3>
          <div className="metricas-grid">
            <div className="metrica-card">
              <div className="metrica-valor">{formatCurrency(metricasViajes.gananciaTotal)}</div>
              <div className="metrica-label">Ingresos Totales</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasViajes.viajesCompletados}</div>
              <div className="metrica-label">Viajes Completados</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasViajes.viajesCancelados}</div>
              <div className="metrica-label">Viajes Cancelados</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasViajes.distanciaTotal.toFixed(1)} km</div>
              <div className="metrica-label">Distancia Total</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{formatCurrency(metricasViajes.tarifaPromedio)}</div>
              <div className="metrica-label">Tarifa Promedio</div>
            </div>
          </div>
        </div>
      );
      
    case 'conductores':
      return (
        <div className="metricas-container">
          <h3>Métricas de Conductores</h3>
          <div className="metricas-grid">
            <div className="metrica-card">
              <div className="metrica-valor">{metricasConductores.activos}</div>
              <div className="metrica-label">Conductores Activos</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasConductores.inactivos}</div>
              <div className="metrica-label">Conductores Inactivos</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasConductores.totalViajes}</div>
              <div className="metrica-label">Total de Viajes</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasConductores.calificacionPromedio.toFixed(1)}</div>
              <div className="metrica-label">Calificación Promedio</div>
            </div>
          </div>
        </div>
      );
      
    case 'solicitudes':
      return (
        <div className="metricas-container">
          <h3>Métricas de Solicitudes</h3>
          <div className="metricas-grid">
            <div className="metrica-card">
              <div className="metrica-valor">{metricasSolicitudes.pendientes}</div>
              <div className="metrica-label">Pendientes</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasSolicitudes.aprobadas}</div>
              <div className="metrica-label">Aprobadas</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasSolicitudes.rechazadas}</div>
              <div className="metrica-label">Rechazadas</div>
            </div>
            <div className="metrica-card">
              <div className="metrica-valor">{metricasSolicitudes.tiempoPromedioAprobacion.toFixed(1)} hrs</div>
              <div className="metrica-label">Tiempo Promedio de Aprobación</div>
            </div>
          </div>
        </div>
      );
      
    default:
      return null;
  }
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
  const conductoresData = {};
 
  viajes.forEach(viaje => {
    if (!conductoresData[viaje.conductor]) {
      conductoresData[viaje.conductor] = {
        totalCalificacion: 0,
        totalViajes: 0,
        ganancias: 0
      };
    }
    conductoresData[viaje.conductor].totalCalificacion += viaje.calificacion || 0;
    conductoresData[viaje.conductor].totalViajes++;
    
    // Sumar ganancias solo para viajes completados
    if (viaje.estado === 'completado') {
      conductoresData[viaje.conductor].ganancias += viaje.precio || 0;
    }
  });
 
  return Object.entries(conductoresData).map(([name, datos]) => ({
    name,
    calificacion: datos.totalViajes > 0 ? datos.totalCalificacion / datos.totalViajes : 0,
    viajes: datos.totalViajes,
    ganancias: datos.ganancias
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
// Renderizado de tabla para viajes - CORREGIDO
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
            <td title={viaje.origen}>{viaje.origen.length > 15 ? viaje.origen.substring(0, 15) + '...' : viaje.origen}</td>
            <td title={viaje.destino}>{viaje.destino.length > 15 ? viaje.destino.substring(0, 15) + '...' : viaje.destino}</td>
            <td>
              <span className={`estado-badge ${viaje.estado}`}>
                {viaje.estado}
              </span>
            </td>
            <td title={viaje.conductor_id}>{viaje.conductor}</td>
            <td title={viaje.cliente_id}>{viaje.cliente}</td>
            <td>{formatCurrency(viaje.precio)}</td>
            <td>{viaje.distancia.toFixed(1)} km</td>
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
              <th>Vehículo</th>
              <th>Placa</th>
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
                <td>{conductor.modelo_vehiculo}</td>
                <td>{conductor.placa_vehiculo}</td>
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
              <th>Vehículo</th>
              <th>Placa</th>
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
                <td>{solicitud.modelo_vehiculo}</td>
                <td>{solicitud.placa_vehiculo}</td>
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
              <th>Usuario</th>
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
                <td>{log.usuario}</td>
                <td>{log.accion}</td>
                <td>{log.modulo}</td>
                <td title={log.detalles}>
                  {log.detalles.length > 30 ? log.detalles.substring(0, 30) + '...' : log.detalles}
                </td>
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
                  <button className="btn-ver" title="Ver grabación" onClick={() => handleVerGrabacion(grabacion.id)}>
                    <i className="fa fa-play-circle"></i>
                  </button>
                  <button className="btn-descargar" title="Descargar grabación" onClick={() => handleDescargarGrabacion(grabacion.id)}>
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
          {/* Renderizar métricas */}
          <div className="metricas-container">
            <h3>Métricas de Viajes</h3>
            <div className="metricas-grid">
              <div className="metrica-card">
                <div className="metrica-valor">{formatCurrency(metricasViajes.gananciaTotal)}</div>
                <div className="metrica-label">Ingresos Totales</div>
              </div>
              <div className="metrica-card">
                <div className="metrica-valor">{metricasViajes.viajesCompletados}</div>
                <div className="metrica-label">Viajes Completados</div>
              </div>
              <div className="metrica-card">
                <div className="metrica-valor">{metricasViajes.viajesCancelados}</div>
                <div className="metrica-label">Viajes Cancelados</div>
              </div>
              <div className="metrica-card">
                <div className="metrica-valor">{metricasViajes.distanciaTotal.toFixed(1)} km</div>
                <div className="metrica-label">Distancia Total</div>
              </div>
              <div className="metrica-card">
                <div className="metrica-valor">{formatCurrency(metricasViajes.tarifaPromedio)}</div>
                <div className="metrica-label">Tarifa Promedio</div>
              </div>
            </div>
          </div>
         
          <div className="grafico-box">
            <h4>Viajes por Día</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viajesDataGrafico} ref={chartRef}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} viajes`, 'Cantidad']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="viajes" 
                  stroke="#2EB086" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2} 
                  name="Viajes" 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
         
          <div className="grafico-box">
            <h4>Ganancias por Día</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viajesDataGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Ganancias']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ganancias" 
                  stroke="#FF8042" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2} 
                  name="Ganancias" 
                  isAnimationActive={false}
                />
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
                  isAnimationActive={false}
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
            <h4>Top Conductores por Viajes</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={generarDatosPorConductor(viajesData)
                  .sort((a, b) => b.viajes - a.viajes)
                  .slice(0, 5)}
                isAnimationActive={false}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'viajes') return [`${value} viajes`, name];
                  return [value, name];
                }} />
                <Legend />
                <Bar dataKey="viajes" fill="#2EB086" name="Viajes" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
      
    case 'conductores':
      return (
        <div className="graficos-container">
          {/* Renderizar métricas */}
          {renderMetricasNegocio()}
        
          <div className="grafico-box">
            <h4>Conductores por Estado</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Activos', value: metricasConductores.activos },
                    { name: 'Inactivos', value: metricasConductores.inactivos }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#2EB086" />
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
                <Bar dataKey="viajesRealizados" fill="#2EB086" name="Viajes Realizados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grafico-box">
            <h4>Top Conductores por Calificación</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conductoresData.filter(c => c.calificacionPromedio > 0).sort((a, b) => b.calificacionPromedio - a.calificacionPromedio).slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="calificacionPromedio" fill="#FFBB28" name="Calificación Promedio" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
   
      case 'solicitudes':
        // Calcular datos para gráficos
        const solicitudesPorEstado = [
          { name: 'Pendientes', value: metricasSolicitudes.pendientes },
          { name: 'Aprobadas', value: metricasSolicitudes.aprobadas },
          { name: 'Rechazadas', value: metricasSolicitudes.rechazadas }
        ].filter(item => item.value > 0); // Filtrar estados sin datos
       
        return (
          <div className="graficos-container">
            {/* Renderizar métricas */}
            {renderMetricasNegocio()}
            
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
                    <Cell fill="#2EB086" /> {/* Aprobadas */}
                    <Cell fill="#DC3545" /> {/* Rechazadas */}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} solicitudes`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grafico-box">
              <h4>Categorías de Licencia Solicitadas</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={
                  (() => {
                    const categorias = {};
                    solicitudesData.forEach(sol => {
                      const cat = sol.licencia_categoria || "No especificada";
                      if (!categorias[cat]) categorias[cat] = 0;
                      categorias[cat]++;
                    });
                    return Object.entries(categorias).map(([name, value]) => ({ name, value }));
                  })()
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#2EB086" name="Solicitudes" />
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
              <h4>Top Administradores por Acciones</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={administradoresData.sort((a, b) => b.accionesRealizadas - a.accionesRealizadas).slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accionesRealizadas" fill="#2EB086" name="Acciones Realizadas" />
                </BarChart>
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
        ].filter(item => item.value > 0); // Filtrar estados sin datos
       
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
                    <Cell fill="#2EB086" /> {/* Disponibles */}
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
                  <Bar dataKey="cantidad" fill="#2EB086" name="Cantidad de Logs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
     
      default:
        return <div className="no-data-message">Seleccione una categoría para ver gráficos estadísticos.</div>;
    }
  };
 
  // Funciones para manejar las grabaciones
  const handleVerGrabacion = (id) => {
    // Implementar lógica para visualizar la grabación
    alert(`Visualizando grabación con ID: ${id}`);
    // Aquí podría abrir un modal o redireccionar a una página de visualización
  };
  
  const handleDescargarGrabacion = (id) => {
    // Implementar lógica para descargar la grabación
    alert(`Descargando grabación con ID: ${id}`);
    // Aquí podría implementar la descarga del archivo
  };
  
  // Ahora el return del componente completo con todo integrado
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
      
      {/* Estilos adicionales para las métricas */}
      <style>{`
        .metricas-container {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          border: 1px solid #e9ecef;
        }
        
        .metricas-container h3 {
          font-size: 18px;
          color: #343a40;
          margin-bottom: 15px;
          text-align: center;
          font-weight: 600;
        }
        
        .metricas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 15px;
        }
        
        .metrica-card {
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .metrica-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .metrica-valor {
          font-size: 24px;
          font-weight: bold;
          color: #2EB086;
          margin-bottom: 5px;
        }
        
        .metrica-label {
          font-size: 14px;
          color: #6c757d;
        }
        
        @media (max-width: 768px) {
          .metricas-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
 };
 
 export default Reportes;