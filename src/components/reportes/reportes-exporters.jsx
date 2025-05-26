import { jsPDF } from 'jspdf';
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

// Función para crear tabla manualmente sin autoTable
const createManualTable = (doc, data, columns, startY, pageWidth, margin) => {
  const cellHeight = 8;
  const headerHeight = 10;
  const fontSize = 8;
  const headerFontSize = 9;
  
  // Calcular ancho de columnas
  const tableWidth = pageWidth - (margin * 2);
  const colWidth = tableWidth / columns.length;
  
  let currentY = startY;
  
  // Dibujar cabecera
  doc.setFontSize(headerFontSize);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(0, 175, 135);
  doc.rect(margin, currentY, tableWidth, headerHeight, 'F');
  
  // Texto de cabecera
  columns.forEach((col, index) => {
    const x = margin + (index * colWidth) + 2;
    const y = currentY + headerHeight - 3;
    doc.text(col, x, y);
  });
  
  currentY += headerHeight;
  
  // Dibujar filas de datos
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  
  data.forEach((row, rowIndex) => {
    // Alternar colores de fila
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, currentY, tableWidth, cellHeight, 'F');
    }
    
    // Dibujar bordes de celda
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.1);
    
    row.forEach((cell, colIndex) => {
      const x = margin + (colIndex * colWidth);
      const y = currentY;
      
      // Borde de celda
      doc.rect(x, y, colWidth, cellHeight);
      
      // Texto de celda (truncar si es muy largo)
      let cellText = String(cell || '');
      if (cellText.length > 15) {
        cellText = cellText.substring(0, 12) + '...';
      }
      
      doc.text(cellText, x + 2, y + cellHeight - 2);
    });
    
    currentY += cellHeight;
    
    // Verificar si necesitamos nueva página
    if (currentY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  return currentY;
};

// Función para generar PDF sin autoTable
const generateManualPDF = (dataToExport, columns, title, subtitle, fileName, extraInfo = '') => {
  try {
    console.log('Iniciando generación de PDF manual...');
    
    const doc = new jsPDF({
      orientation: dataToExport[0] && dataToExport[0].length > 6 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0, 47, 108);
    doc.text('VIAJE SEGURO', pageWidth / 2, margin + 5, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, margin + 15, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
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

    // Crear tabla manual
    const finalY = createManualTable(doc, dataToExport, columns, margin + 35, pageWidth, margin);

    // Agregar métricas si existen
    if (extraInfo && finalY + 40 < pageHeight - margin) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, finalY + 10, pageWidth - margin, finalY + 10);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 47, 108);
      doc.text("Resumen Ejecutivo", margin, finalY + 20);
      
      doc.setFont('helvetica', 'normal');
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

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`© ${new Date().getFullYear()} Viaje Seguro`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    console.log('PDF generado exitosamente');
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Error detallado al generar PDF manual:", error);
    return false;
  }
};

// Función alternativa: Exportar como HTML para imprimir
const exportarHTMLParaImprimir = (dataToExport, columns, title, subtitle, extraInfo = '') => {
  try {
    console.log('Generando vista HTML para imprimir...');
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const tableRows = dataToExport.map(row => 
      `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`
    ).join('');
    
    const metricsSection = extraInfo ? `
      <div class="metrics">
        <h3>Resumen Ejecutivo</h3>
        <pre>${extraInfo}</pre>
      </div>
    ` : '';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 12px;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #00AF87;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #002F6C; 
            margin: 0;
            font-size: 24px;
          }
          .header h2 { 
            color: #002F6C; 
            margin: 10px 0;
            font-size: 18px;
          }
          .header p { 
            color: #666; 
            margin: 5px 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 10px;
          }
          th { 
            background-color: #00AF87; 
            color: white; 
            padding: 8px 4px; 
            text-align: left;
            border: 1px solid #ddd;
            font-weight: bold;
          }
          td { 
            border: 1px solid #ddd; 
            padding: 6px 4px; 
            text-align: left;
          }
          tr:nth-child(even) { 
            background-color: #f8f9fa; 
          }
          .metrics {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            border-left: 4px solid #00AF87;
          }
          .metrics h3 {
            color: #002F6C;
            margin-top: 0;
          }
          .metrics pre {
            background-color: white;
            padding: 10px;
            border-radius: 3px;
            border: 1px solid #ddd;
            white-space: pre-wrap;
            font-size: 11px;
          }
          .print-btn {
            background-color: #00AF87;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .print-btn:hover {
            background-color: #008a6a;
          }
          @media print { 
            .no-print { display: none; }
            body { margin: 0; }
            .header { border-bottom: 2px solid #00AF87; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>VIAJE SEGURO</h1>
          <h2>${title}</h2>
          <p>${subtitle}</p>
          <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
        </div>
        
        <button class="print-btn no-print" onclick="window.print()">
          🖨️ Imprimir como PDF
        </button>
        
        <table>
          <thead>
            <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        ${metricsSection}
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 10px;">
          © ${new Date().getFullYear()} Viaje Seguro - Sistema de Reportes
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    return true;
  } catch (error) {
    console.error("Error al generar vista HTML:", error);
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

// Función principal de exportación PDF con fallback
export const exportarPDF = (dataToExport, activeTab, fechaInicio, fechaFin, metricas) => {
  if (!dataToExport || dataToExport.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  console.log('Iniciando exportación PDF para:', activeTab);

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
        (v.origen || '').length > 20 ? (v.origen || '').substring(0, 17) + '...' : (v.origen || ''), 
        (v.destino || '').length > 20 ? (v.destino || '').substring(0, 17) + '...' : (v.destino || ''), 
        v.estado || '', 
        (v.conductor || '').length > 15 ? (v.conductor || '').substring(0, 12) + '...' : (v.conductor || ''), 
        (v.cliente || '').length > 15 ? (v.cliente || '').substring(0, 12) + '...' : (v.cliente || ''), 
        formatCurrency(v.precio || 0), 
        `${(v.distancia || 0).toFixed(1)}km`, 
        `${v.duracion || 0}min`, 
        v.calificacion || 0
      ]);
      columns = ['Fecha', 'Origen', 'Destino', 'Estado', 'Conductor', 'Cliente', 'Precio', 'Dist.', 'Dur.', 'Cal.'];
      title = 'Reporte de Viajes';
      subtitle = `Período: ${formatDateShort(fechaInicio)} - ${formatDateShort(fechaFin)}`;
      fileName = `Viajes_${formatDateShort(fechaInicio).replace(/\//g, '-')}_a_${formatDateShort(fechaFin).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.viajes) {
        extraInfo = `Métricas del Período:
- Ganancia Total: ${formatCurrency(metricas.viajes.gananciaTotal || 0)}
- Viajes Completados: ${metricas.viajes.viajesCompletados || 0}
- Viajes Cancelados: ${metricas.viajes.viajesCancelados || 0}
- Distancia Total: ${(metricas.viajes.distanciaTotal || 0).toFixed(1)} km
- Distancia Promedio: ${(metricas.viajes.distanciaPromedio || 0).toFixed(1)} km
- Tarifa Promedio: ${formatCurrency(metricas.viajes.tarifaPromedio || 0)}`;
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
        (c.calificacionPromedio || 0).toFixed(1)
      ]);
      columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Registro', 'Estado', 'Viajes', 'Cal.'];
      title = 'Reporte de Conductores';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Conductores_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.conductores) {
        extraInfo = `Métricas de Conductores:
- Conductores Activos: ${metricas.conductores.activos || 0}
- Conductores Inactivos: ${metricas.conductores.inactivos || 0}
- Total de Viajes Realizados: ${metricas.conductores.totalViajes || 0}
- Calificación Promedio: ${(metricas.conductores.calificacionPromedio || 0).toFixed(1)}`;
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
        s.documentosCompletos ? 'Sí' : 'No'
      ]);
      columns = ['Nombre', 'Email', 'Teléfono', 'Licencia', 'Fecha Solicitud', 'Estado', 'Docs.'];
      title = 'Reporte de Solicitudes';
      subtitle = `Generado: ${formatDateShort(new Date())}`;
      fileName = `Solicitudes_${formatDateShort(new Date()).replace(/\//g, '-')}.pdf`;
      
      if (metricas && metricas.solicitudes) {
        extraInfo = `Métricas de Solicitudes:
- Pendientes: ${metricas.solicitudes.pendientes || 0}
- Aprobadas: ${metricas.solicitudes.aprobadas || 0}
- Rechazadas: ${metricas.solicitudes.rechazadas || 0}
- Tiempo Promedio de Aprobación: ${(metricas.solicitudes.tiempoPromedioAprobacion || 0).toFixed(1)} horas`;
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
        (l.detalles || '').length > 25 ? (l.detalles || '').substring(0, 22) + '...' : (l.detalles || ''), 
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

  // Intentar PDF manual primero
  console.log('Intentando generar PDF manual...');
  const pdfSuccess = generateManualPDF(processedData, columns, title, subtitle, fileName, extraInfo);
  
  if (!pdfSuccess) {
    console.log('PDF manual falló, intentando vista HTML...');
    // Si falla, usar vista HTML para imprimir
    const htmlSuccess = exportarHTMLParaImprimir(processedData, columns, title, subtitle, extraInfo);
    
    if (!htmlSuccess) {
      alert('Error al generar el reporte. Por favor, intente nuevamente o contacte al administrador.');
    } else {
      // Mostrar instrucciones al usuario
      setTimeout(() => {
        alert('Se ha abierto una nueva ventana. Use Ctrl+P (Cmd+P en Mac) para imprimir como PDF.');
      }, 500);
    }
  }
};