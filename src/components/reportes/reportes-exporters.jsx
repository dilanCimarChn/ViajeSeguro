import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Función para formatear fecha corta
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

// Logo en Base64 (solución más confiable para producción)
const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // Placeholder, reemplaza con tu logo real

// Función alternativa para generar PDF sin recursos externos
const generateSimplePDF = (dataToExport, columns, title, subtitle, fileName, extraInfo = '') => {
  try {
    const doc = new jsPDF({
      orientation: dataToExport[0] && dataToExport[0].length > 6 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurar fuente
    doc.setFont('helvetica');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Cabecera simple sin logo externo
    doc.setFontSize(20);
    doc.setTextColor(0, 47, 108);
    doc.text('VIAJE SEGURO', pageWidth / 2, margin + 5, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 47, 108);
    doc.text(title, pageWidth / 2, margin + 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(subtitle, pageWidth / 2, margin + 25, { align: 'center' });
    
    // Información de generación
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth - margin, margin + 5, { align: 'right' });
    
    // Línea divisoria
    doc.setDrawColor(0, 175, 135);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 30, pageWidth - margin, margin + 30);

    // Configurar tabla
    const tableOptions = {
      head: [columns],
      body: dataToExport,
      startY: margin + 35,
      margin: { left: margin, right: margin },
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        font: 'helvetica',
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: { 
        fillColor: [0, 175, 135],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        // Ajustar anchos según el número de columnas
        ...Object.fromEntries(
          columns.map((_, index) => [index, { cellWidth: 'auto' }])
        )
      },
      didDrawPage: (data) => {
        // Pie de página
        const footerText = `© ${new Date().getFullYear()} Viaje Seguro - Página ${data.pageNumber}`;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    };

    // Agregar tabla
    doc.autoTable(tableOptions);

    // Agregar métricas si existen
    if (extraInfo) {
      const finalY = doc.lastAutoTable.finalY || margin + 40;
      
      if (finalY + 40 < pageHeight - margin) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, finalY + 10, pageWidth - margin, finalY + 10);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 47, 108);
        doc.text("Resumen Ejecutivo", margin, finalY + 20);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        const lines = extraInfo.split('\n').filter(line => line.trim() !== '');
        let yPos = finalY + 28;
        
        lines.forEach(line => {
          if (yPos < pageHeight - 20) {
            doc.text(line.trim(), margin, yPos);
            yPos += 5;
          }
        });
      }
    }

    // Descargar
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Error al generar PDF simple:", error);
    return false;
  }
};

// Función para exportar datos a CSV (sin cambios)
export const exportarCSV = (dataToExport, activeTab, fechaInicio, fechaFin, idioma) => {
  let fileName = '';
  let delimiter = idioma === 'es' ? ';' : ',';
  
  switch(activeTab) {
    case 'viajes':
      fileName = `viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.csv`;
      break;
    case 'conductores':
      fileName = `conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'solicitudes':
      fileName = `solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'admins':
      fileName = `administradores_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'grabaciones':
      fileName = `grabaciones_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    case 'logs':
      fileName = `logs_${formatDateShort(new Date()).replace(/\//g, '-')}.csv`;
      break;
    default:
      alert('No hay datos para exportar');
      return;
  }

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
    case 'admins':
      dataPreparada = dataToExport.map(item => ({
        Nombre: item.nombre,
        Email: item.email,
        Rol: item.rol,
        'Fecha Registro': item.fechaRegistro,
        'Último Acceso': item.ultimoAcceso,
        'Acciones Realizadas': item.accionesRealizadas,
        Estado: item.active ? 'Activo' : 'Inactivo'
      }));
      break;
    case 'grabaciones':
      dataPreparada = dataToExport.map(item => ({
        'ID Viaje': item.viajeId,
        'ID Conductor': item.conductorId,
        Fecha: item.fecha,
        Duración: item.duracion,
        Tamaño: item.tamaño,
        Estado: item.estado,
        Visualizaciones: item.visualizaciones
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
  
  const csvOptions = {
    delimiter: delimiter,
    header: true,
    quotes: true,
    quoteChar: '"',
    escapeChar: '"'
  };

  const csv = Papa.unparse(dataPreparada, csvOptions);
  const csvContent = '\uFEFF' + csv;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Función mejorada para exportar reportes a PDF (versión producción)
export const exportarPDF = (dataToExport, activeTab, fechaInicio, fechaFin, metricas) => {
  if (!dataToExport || dataToExport.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  let columns = [];
  let title = '';
  let subtitle = '';
  let fileName = '';
  let extraInfo = '';
  let processedData = [];

  // Configurar datos según tipo de reporte
  switch(activeTab) {
    case 'viajes':
      processedData = dataToExport.map(v => [
        v.fecha || '', 
        (v.origen || '').length > 15 ? (v.origen || '').substring(0, 15) + '...' : (v.origen || ''), 
        (v.destino || '').length > 15 ? (v.destino || '').substring(0, 15) + '...' : (v.destino || ''), 
        v.estado || '', 
        v.conductor || '', 
        v.cliente || '', 
        formatCurrency(v.precio || 0), 
        `${(v.distancia || 0).toFixed(1)} km`, 
        `${v.duracion || 0} min`, 
        v.calificacion || 0
      ]);
      columns = ['Fecha', 'Origen', 'Destino', 'Estado', 'Conductor', 'Cliente', 'Precio', 'Distancia', 'Duración', 'Cal.'];
      title = 'Reporte de Viajes';
      subtitle = `Período: ${formatDateShort(fechaInicio)} - ${formatDateShort(fechaFin)}`;
      fileName = `Viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.viajes) {
        extraInfo = `
          Métricas del Período:
          - Ganancia Total: ${formatCurrency(metricas.viajes.gananciaTotal || 0)}
          - Viajes Completados: ${metricas.viajes.viajesCompletados || 0}
          - Viajes Cancelados: ${metricas.viajes.viajesCancelados || 0}
          - Distancia Total: ${(metricas.viajes.distanciaTotal || 0).toFixed(1)} km
          - Distancia Promedio: ${(metricas.viajes.distanciaPromedio || 0).toFixed(1)} km
          - Tarifa Promedio: ${formatCurrency(metricas.viajes.tarifaPromedio || 0)}
        `;
      }
      break;
      
    case 'conductores':
      processedData = dataToExport.map(c => [
        c.nombre || '', 
        c.email || '', 
        c.telefono || '', 
        c.licencia || '', 
        c.fechaRegistro || '', 
        c.estado || '', 
        c.viajesRealizados || 0, 
        (c.calificacionPromedio || 0).toFixed(1),
        c.modelo_vehiculo || '',
        c.placa_vehiculo || ''
      ]);
      columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Registro', 'Estado', 'Viajes', 'Cal.', 'Modelo', 'Placa'];
      title = 'Reporte de Conductores';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.conductores) {
        extraInfo = `
          Métricas de Conductores:
          - Conductores Activos: ${metricas.conductores.activos || 0}
          - Conductores Inactivos: ${metricas.conductores.inactivos || 0}
          - Total de Viajes Realizados: ${metricas.conductores.totalViajes || 0}
          - Calificación Promedio: ${(metricas.conductores.calificacionPromedio || 0).toFixed(1)}
        `;
      }
      break;
      
    case 'solicitudes':
      processedData = dataToExport.map(s => [
        s.nombre || '', 
        s.email || '', 
        s.telefono || '', 
        s.licencia || '', 
        s.fechaSolicitud || '', 
        s.estado || '', 
        s.documentosCompletos ? 'Sí' : 'No',
        s.fecha_aprobacion || 'N/A',
        s.modelo_vehiculo || ''
      ]);
      columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Fecha Solicitud', 'Estado', 'Docs.', 'Aprobación', 'Vehículo'];
      title = 'Reporte de Solicitudes';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.solicitudes) {
        extraInfo = `
          Métricas de Solicitudes:
          - Pendientes: ${metricas.solicitudes.pendientes || 0}
          - Aprobadas: ${metricas.solicitudes.aprobadas || 0}
          - Rechazadas: ${metricas.solicitudes.rechazadas || 0}
          - Tiempo Promedio de Aprobación: ${(metricas.solicitudes.tiempoPromedioAprobacion || 0).toFixed(1)} horas
        `;
      }
      break;
      
    case 'admins':
      processedData = dataToExport.map(a => [
        a.nombre || '', 
        a.email || '', 
        a.rol || '', 
        a.fechaRegistro || '', 
        a.ultimoAcceso || '', 
        a.accionesRealizadas || 0,
        a.active ? 'Activo' : 'Inactivo'
      ]);
      columns = ['Nombre', 'Email', 'Rol', 'Registro', 'Último Acceso', 'Acciones', 'Estado'];
      title = 'Reporte de Administradores';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Administradores_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      break;
      
    case 'grabaciones':
      processedData = dataToExport.map(g => [
        g.viajeId || '', 
        g.conductorId || '', 
        g.fecha || '', 
        g.duracion || '', 
        g.tamaño || '', 
        g.estado || '', 
        g.visualizaciones || 0
      ]);
      columns = ['ID Viaje', 'ID Conductor', 'Fecha', 'Duración', 'Tamaño', 'Estado', 'Vistas'];
      title = 'Reporte de Grabaciones';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Grabaciones_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      break;
      
    case 'logs':
      processedData = dataToExport.map(l => [
        l.fecha || '', 
        l.usuario || '',
        l.accion || '', 
        (l.detalles || '').length > 25 ? (l.detalles || '').substring(0, 25) + '...' : (l.detalles || ''), 
        l.modulo || '', 
        l.resultado || ''
      ]);
      columns = ['Fecha', 'Usuario', 'Acción', 'Detalles', 'Módulo', 'Resultado'];
      title = 'Reporte de Logs del Sistema';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Logs_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      break;
      
    default:
      alert('Tipo de reporte no válido');
      return;
  }

  // Intentar generar PDF simple (más confiable en producción)
  const success = generateSimplePDF(processedData, columns, title, subtitle, fileName, extraInfo);
  
  if (!success) {
    alert('Error al generar el PDF. Por favor, intente nuevamente o contacte al administrador.');
  }
};