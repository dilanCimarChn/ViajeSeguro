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

// URL del logo para los reportes PDF
const logoUrl = 'https://i.ibb.co/xtN8mjLv/logo.png';

// Función para exportar datos a CSV
export const exportarCSV = (dataToExport, activeTab, fechaInicio, fechaFin, idioma) => {
  let fileName = '';
  let delimiter = idioma === 'es' ? ';' : ','; // Usar punto y coma para español, coma para inglés
  
  // Generar nombre de archivo según la categoría
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
export const exportarPDF = (dataToExport, activeTab, fechaInicio, fechaFin, metricas) => {
  let columns = [];
  let title = '';
  let subtitle = '';
  let fileName = '';
  let extraInfo = '';

  // Configurar datos según tipo de reporte
  switch(activeTab) {
    case 'viajes':
      dataToExport = dataToExport.map(v => [
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
        - Ganancia Total: ${formatCurrency(metricas.viajes.gananciaTotal)}
        - Viajes Completados: ${metricas.viajes.viajesCompletados}
        - Viajes Cancelados: ${metricas.viajes.viajesCancelados}
        - Distancia Total: ${metricas.viajes.distanciaTotal.toFixed(1)} km
        - Distancia Promedio: ${metricas.viajes.distanciaPromedio.toFixed(1)} km
        - Tarifa Promedio: ${formatCurrency(metricas.viajes.tarifaPromedio)}
      `;
      break;
      
    case 'conductores':
      dataToExport = dataToExport.map(c => [
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
        - Conductores Activos: ${metricas.conductores.activos}
        - Conductores Inactivos: ${metricas.conductores.inactivos}
        - Total de Viajes Realizados: ${metricas.conductores.totalViajes}
        - Calificación Promedio: ${metricas.conductores.calificacionPromedio.toFixed(1)}
      `;
      break;
      
    case 'solicitudes':
      dataToExport = dataToExport.map(s => [
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
        - Pendientes: ${metricas.solicitudes.pendientes}
        - Aprobadas: ${metricas.solicitudes.aprobadas}
        - Rechazadas: ${metricas.solicitudes.rechazadas}
        - Tiempo Promedio de Aprobación: ${metricas.solicitudes.tiempoPromedioAprobacion.toFixed(1)} horas
      `;
      break;
      
    case 'admins':
      dataToExport = dataToExport.map(a => [
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
      dataToExport = dataToExport.map(g => [
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
      dataToExport = dataToExport.map(l => [
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
            if (metricas.viajes.gananciaDiaria && Object.keys(metricas.viajes.gananciaDiaria).length > 2) {
              yPos += 5;
              doc.text('Desglose de Ganancias por Día (Top 5):', margin, yPos);
              yPos += 5;
              
              Object.entries(metricas.viajes.gananciaDiaria)
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
            const conductoresTop = [...dataToExport]
              .filter(c => parseFloat(c[7]) > 0) // Filtrar por calificación > 0
              .sort((a, b) => parseFloat(b[7]) - parseFloat(a[7])) // Ordenar por calificación
              .slice(0, 3);
              
            if (conductoresTop.length > 0) {
              yPos += 5;
              doc.text('Top Conductores por Calificación:', margin, yPos);
              yPos += 5;
              
              conductoresTop.forEach((c, index) => {
                doc.text(`${index + 1}. ${c[0]}: ${c[7]} ★ (${c[6]} viajes)`, margin + 5, yPos);
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