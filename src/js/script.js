document.addEventListener('DOMContentLoaded', handleFile);

let data = [];
let totalDiurnasSeconds = 0;
let totalNocturnasSeconds = 0;
let registroHoras = {};
let totals = {
    aprobadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
    rechazadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
    pendientes: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 }
};
const feriados = [
    '01-01', '29-03', '30-03', '01-05', '21-05', '09-06', '20-06', '29-06',
    '16-07', '15-08', '18-09', '19-09', '20-09', '12-10', '27-10', '31-10',
    '01-11', '08-12', '25-12'
];
function handleFile() {
    fetch('./Data.dat')
        .then(response => response.text())
        .then(content => {
            parseData(content);
        })
        .catch(error => console.error('Error al cargar el archivo:', error));
}
function parseData(content) {
    const lines = content.split('\n');
    data = lines.map(line => {
        const splitLine = line.trim().split('\t');
        if (splitLine.length < 6) {
            return null;
        }
        const [id, timestamp, field1, field2, eventCode, field3] = splitLine;
        return {
            id: parseInt(id.trim()),
            timestamp: new Date(timestamp.trim()),
            field1: field1 ? field1.trim() : null,
            field2: field2 ? field2.trim() : null,
            eventCode: parseInt(eventCode ? eventCode.trim() : '0'),
            field3: field3 ? field3.trim() : null
        };
    }).filter(item => item !== null);

    
}
function filterData() {
    resetTotals();  // Resetear los totales antes de generar un nuevo reporte

    const idInput = parseInt(document.getElementById('idInput').value.trim());
    const monthInput = parseInt(document.getElementById('monthInput').value.trim()) - 1;
    const yearInput = parseInt(document.getElementById('yearInput').value.trim());

    const filteredData = data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return (
            item.id === idInput &&
            itemDate.getMonth() === monthInput &&
            itemDate.getFullYear() === yearInput
        );
    });

    generateReport(filteredData);
}
function esFeriado(fecha) {
    const day = fecha.getDay(); // Obtener el día de la semana (0 es domingo, 6 es sábado)
    const formattedDate = `${("0" + fecha.getDate()).slice(-2)}-${("0" + (fecha.getMonth() + 1)).slice(-2)}`;

    // Agregar un console.log para depuración
    //console.log("Fecha:", fecha, "Día:", day, "¿Es feriado?", feriados.includes(formattedDate), "¿Es fin de semana?", (day === 0 || day === 6));

    // Verificar si es fin de semana o está en la lista de feriados
    return day === 0 || day === 6 || feriados.includes(formattedDate);
}
function calcularHorasExtras(startTime, endTime) {
    const startOfWorkDay = new Date(startTime);
    startOfWorkDay.setHours(8, 33, 0, 0);

    const endOfWorkDay = new Date(startTime);
    endOfWorkDay.setHours(17, 33, 0, 0);

    const startOfDiurnalOvertime = new Date(startTime);
    startOfDiurnalOvertime.setHours(17, 34, 0, 0);

    const endOfDiurnalOvertime = new Date(startTime);
    endOfDiurnalOvertime.setHours(20, 59, 59, 999);

    const startOfNocturnalOvertime = new Date(startTime);
    startOfNocturnalOvertime.setHours(21, 0, 0, 0);

    let diurnalOvertimeSeconds = 0;
    let nocturnalOvertimeSeconds = 0;
    let workSeconds = 0;
    let alertMessage = "";
    let alertType = ""; // Nuevo: tipo de alerta

    // Condición específica para el 17 de septiembre
    const isSept17 = startTime.getMonth() === 8 && startTime.getDate() === 17;
    
    if (isSept17) {
        const startOfDiurnalSept17 = new Date(startTime);
        startOfDiurnalSept17.setHours(12, 0, 0, 0);

        if (startTime < startOfDiurnalSept17) {
            startTime = startOfDiurnalSept17;
        }
        
        if (endTime <= endOfDiurnalOvertime) {
            diurnalOvertimeSeconds = (endTime - startTime) / 1000;
        } else {
            diurnalOvertimeSeconds = (endOfDiurnalOvertime - startTime) / 1000;
            nocturnalOvertimeSeconds = (endTime - startOfNocturnalOvertime) / 1000;
        }
    } else if (!esFeriado(startTime)) {
        // Verificar entrada temprana
        if (startTime < startOfWorkDay) {
            alertMessage = `<span class="alert-text warning"><i class="fas fa-exclamation-triangle"></i> Entrada anticipada: ${startTime.toLocaleTimeString()} (Horario normal inicia 8:33)</span>`;
            alertType = "warning";
            startTime = startOfWorkDay;
        }
        
        if (endTime <= endOfWorkDay) {
            workSeconds = (endTime - startTime) / 1000;
            // Verificar salida temprana
            if (endTime < endOfWorkDay) {
                alertMessage = `<span class="alert-text warning"><i class="fas fa-exclamation-triangle"></i> Salida anticipada: ${endTime.toLocaleTimeString()} (Horario normal termina 17:33)</span>`;
                alertType = "warning";
            }
        } else {
            workSeconds = (endOfWorkDay - startTime) / 1000;
            
            if (endTime > endOfWorkDay && endTime <= endOfDiurnalOvertime) {
                diurnalOvertimeSeconds = (endTime - endOfWorkDay) / 1000;
                // Alerta de horas extras diurnas
                alertMessage = `<span class="alert-text info"><i class="fas fa-info-circle"></i> Horas extras diurnas registradas: ${formatTime(diurnalOvertimeSeconds)}</span>`;
                alertType = "info";
            } else if (endTime > endOfDiurnalOvertime) {
                diurnalOvertimeSeconds = (endOfDiurnalOvertime - endOfWorkDay) / 1000;
                nocturnalOvertimeSeconds = (endTime - startOfNocturnalOvertime) / 1000;
                // Alerta de horas extras nocturnas
                alertMessage = `<span class="alert-text info"><i class="fas fa-moon"></i> Horas extras nocturnas registradas: ${formatTime(nocturnalOvertimeSeconds)}</span>`;
                alertType = "info";
            }
        }
    } else {
        nocturnalOvertimeSeconds = (endTime - startTime) / 1000;
        // Alerta de día feriado
        alertMessage = `<span class="alert-text info"><i class="fas fa-calendar-check"></i> Día feriado o fin de semana - Todas las horas se calculan al 50%</span>`;
        alertType = "info";
    }

    // Alertas críticas
    if (startTime.getTime() === endTime.getTime()) {
        alertMessage = `<span class="alert-text"><i class="fas fa-exclamation-circle"></i> Error: Falta marcación de entrada o salida</span>`;
        alertType = "error";
    } else if ((diurnalOvertimeSeconds === 0 && nocturnalOvertimeSeconds === 0) && workSeconds === 0) {
        alertMessage = `<span class="alert-text"><i class="fas fa-exclamation-circle"></i> Error: No se registraron horas trabajadas</span>`;
        alertType = "error";
    }

    // Verificar jornada extendida (más de 12 horas)
    const totalWorkTime = (endTime - startTime) / 1000;
    if (totalWorkTime > 12 * 3600) {
        alertMessage = `<span class="alert-text"><i class="fas fa-exclamation-triangle"></i> Advertencia: Jornada extendida detectada (${formatTime(totalWorkTime)})</span>`;
        alertType = "warning";
    }

    return {
        diurnalSeconds: Math.round(diurnalOvertimeSeconds),
        nocturnalSeconds: Math.round(nocturnalOvertimeSeconds),
        workSeconds: Math.round(workSeconds),
        alertMessage,
        alertType
    };
}
function actualizarTotales(totals, status, horasExtrasDiurnas, horasExtrasNocturnas, restar = false) {
    const diurnasPartes = horasExtrasDiurnas.split(':');
    const nocturnasPartes = horasExtrasNocturnas.split(':');

    const segundosDiurnas = parseInt(diurnasPartes[0]) * 3600 + parseInt(diurnasPartes[1]) * 60 + parseInt(diurnasPartes[2]);
    const segundosNocturnas = parseInt(nocturnasPartes[0]) * 3600 + parseInt(nocturnasPartes[1]) * 60 + parseInt(nocturnasPartes[2]);

    // Factor determina si restamos o sumamos
    const factor = restar ? -1 : 1;

    if (status === "AUTORIZADO") {
        totals.aprobadas["25%"] += segundosDiurnas * factor;
        totals.aprobadas["50%"] += segundosNocturnas * factor;
    } else if (status === "RECHAZADO") {
        totals.rechazadas["25%"] += segundosDiurnas * factor;
        totals.rechazadas["50%"] += segundosNocturnas * factor;
    } else if (status === "PENDIENTE") {
        totals.pendientes["25%"] += segundosDiurnas * factor;
        totals.pendientes["50%"] += segundosNocturnas * factor;
    }
}
function mostrarResumen() {
    // Totales individuales por estado
    const totalAprobadasDiurnas = totals.aprobadas["25%"];
    const totalAprobadasNocturnas = totals.aprobadas["50%"];
    const totalRechazadasDiurnas = totals.rechazadas["25%"];
    const totalRechazadasNocturnas = totals.rechazadas["50%"];
    const totalPendientesDiurnas = totals.pendientes["25%"];
    const totalPendientesNocturnas = totals.pendientes["50%"];

    // Sumar todos los totales sin restar entre estados
    const totalDiurnas = totalAprobadasDiurnas + totalRechazadasDiurnas + totalPendientesDiurnas;
    const totalNocturnas = totalAprobadasNocturnas + totalRechazadasNocturnas + totalPendientesNocturnas;

    // Formatear los totales para mostrarlos en hh:mm:ss
    const totalDiurnasFormatted = formatTime(totalDiurnas);
    const totalNocturnasFormatted = formatTime(totalNocturnas);
    const totalAprobadasDiurnasFormatted = formatTime(totalAprobadasDiurnas);
    const totalAprobadasNocturnasFormatted = formatTime(totalAprobadasNocturnas);
    const totalRechazadasDiurnasFormatted = formatTime(totalRechazadasDiurnas);
    const totalRechazadasNocturnasFormatted = formatTime(totalRechazadasNocturnas);
    const totalPendientesDiurnasFormatted = formatTime(totalPendientesDiurnas);
    const totalPendientesNocturnasFormatted = formatTime(totalPendientesNocturnas);

    // Mostrar el resumen en el contenedor HTML
    document.getElementById('resumen-container').innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <h3>Total H.E. Aprobadas</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>${totalAprobadasDiurnasFormatted}</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>${totalAprobadasNocturnasFormatted}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-4">
                <h3>Total H.E. Rechazadas</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>${totalRechazadasDiurnasFormatted}</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>${totalRechazadasNocturnasFormatted}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-4">
                <h3>Total H.E. Pendientes</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>${totalPendientesDiurnasFormatted}</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>${totalPendientesNocturnasFormatted}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      
        <div class="row">
            <div class="col-md-12">
                <h3>Suma Total de Horas Extras</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td><strong>Suma Total Horas Extras Aprobadas Diurnas + Nocturnas:</strong></td><td><strong>${formatTime(totalAprobadasDiurnas + totalAprobadasNocturnas)}</strong></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Para depuración: mostrar en consola los valores totales
    console.log("Totales Aprobadas Diurnas:", totalAprobadasDiurnasFormatted);
    console.log("Totales Rechazadas Diurnas:", totalRechazadasDiurnasFormatted);
    console.log("Totales Pendientes Diurnas:", totalPendientesDiurnasFormatted);
    console.log("Total Horas Diurnas:", totalDiurnasFormatted);

    console.log("Totales Aprobadas Nocturnas:", totalAprobadasNocturnasFormatted);
    console.log("Totales Rechazadas Nocturnas:", totalRechazadasNocturnasFormatted);
    console.log("Totales Pendientes Nocturnas:", totalPendientesNocturnasFormatted);
    console.log("Total Horas Nocturnas:", totalNocturnasFormatted);
}
function generateReport(filteredData) {
    // Reiniciar los totales al generar un nuevo reporte
    totalDiurnasSeconds = 0;
    totalNocturnasSeconds = 0;
    
    let dailyData = {};

    // Recorrer los registros para generar los datos diarios
    filteredData.forEach(item => {
        const timestamp = new Date(item.timestamp);
        const dateKey = timestamp.toLocaleDateString();

        if (!dailyData[dateKey]) {
            // Crear un nuevo registro para la fecha
            dailyData[dateKey] = {
                id: item.id,
                date: dateKey,
                startTime: timestamp,
                endTime: timestamp,
                autoAssigned: false
            };
        } else {
            // Actualizar el registro existente si es la misma fecha
            if (timestamp < dailyData[dateKey].startTime) {
                dailyData[dateKey].startTime = timestamp;
            }
            if (timestamp > dailyData[dateKey].endTime) {
                dailyData[dateKey].endTime = timestamp;
            }
        }
    });

    let tableContent = "";

    for (let date in dailyData) {
        const record = dailyData[date];

        let startTimeFormatted = record.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let endTimeFormatted = record.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let alertMessage = "";
        let alertClass = '';

        let diurnalFormatted = "00:00:00";
        let nocturnalFormatted = "00:00:00";

        // Si la hora de inicio y la hora de fin son iguales, mostrar alerta de falta de marcación
        if (record.startTime.getTime() === record.endTime.getTime()) {
            alertMessage = `<span class="alert-text"><i class="fas fa-exclamation-circle"></i> Error: Falta marcación de entrada o salida</span>`;
            alertClass = 'alerta-horas';
        } else {
            // Calcular las horas extras
            let { diurnalSeconds, nocturnalSeconds, alertMessage: extraAlertMessage, alertType } = calcularHorasExtras(record.startTime, record.endTime);

            diurnalFormatted = formatTime(diurnalSeconds);
            nocturnalFormatted = formatTime(nocturnalSeconds);

            totalDiurnasSeconds += diurnalSeconds;
            totalNocturnasSeconds += nocturnalSeconds;

            // Añadir mensaje de alerta y clase según el tipo
            if (extraAlertMessage) {
                alertMessage = extraAlertMessage;
                switch (alertType) {
                    case 'error':
                        alertClass = 'alerta-horas';
                        break;
                    case 'warning':
                        alertClass = 'alerta-warning';
                        break;
                    case 'info':
                        alertClass = '';
                        break;
                }
            }
        }

        tableContent += `
            <tr class="${alertClass}">
                <td><i class="fas fa-calendar-day"></i> ${record.date}</td>
                <td data-timestamp="${record.startTime.toISOString()}"><i class="fas fa-clock"></i> ${startTimeFormatted}</td>
                <td data-timestamp="${record.endTime.toISOString()}"><i class="fas fa-clock"></i> ${endTimeFormatted}</td>
                <td><i class="fas fa-sun"></i> ${diurnalFormatted}</td>
                <td><i class="fas fa-moon"></i> ${nocturnalFormatted}</td>
                <td>
                    <select class="status-select" onchange="updateTotal(this, '${record.date}', '${diurnalFormatted}', '${nocturnalFormatted}')">
                        <option value="AUTORIZADO" selected><i class="fas fa-check"></i> AUTORIZADO</option>
                        <option value="RECHAZADO"><i class="fas fa-times"></i> RECHAZADO</option>
                        <option value="PENDIENTE"><i class="fas fa-clock"></i> PENDIENTE</option>
                    </select>
                </td>
                <td>${alertMessage}</td>
                <td>
                    <button class="time-edit-btn" onclick="enableRowEdit(this.closest('tr'))">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;

        actualizarTotales(totals, 'AUTORIZADO', diurnalFormatted, nocturnalFormatted);
    }

    // Convertir los totales de segundos a formato hh:mm:ss
    let totalCombinedSeconds = totalDiurnasSeconds + totalNocturnasSeconds;
    let totalDiurnasFormatted = formatTime(totalDiurnasSeconds);
    let totalNocturnasFormatted = formatTime(totalNocturnasSeconds);
    let totalCombinedFormatted = formatTime(totalCombinedSeconds);

    // Añadir las filas de totales correctamente al final
    let totalRows = `
        <tr class="table-info">
            <td colspan="3"><strong><i class="fas fa-calculator"></i> Total</strong></td>
            <td><strong><i class="fas fa-sun"></i> ${totalDiurnasFormatted}</strong></td>
            <td><strong><i class="fas fa-moon"></i> ${totalNocturnasFormatted}</strong></td>
            <td colspan="2"></td>
        </tr>
        <tr class="table-primary">
            <td colspan="4"><strong><i class="fas fa-sum"></i> Total Combinado</strong></td>
            <td colspan="3"><strong>${totalCombinedFormatted}</strong></td>
        </tr>
    `;

    // Mostrar el contenido de la tabla en el DOM
    document.getElementById('output').innerHTML = `
        <h2><i class="fas fa-file-alt"></i> Reporte de Horas Extras</h2>
        <table class="table">
            <thead>
                <tr>
                    <th><i class="fas fa-calendar"></i> Fecha</th>
                    <th><i class="fas fa-sign-in-alt"></i> Hora Inicio</th>
                    <th><i class="fas fa-sign-out-alt"></i> Hora Fin</th>
                    <th><i class="fas fa-sun"></i> Horas Extras Diurnas (25%)</th>
                    <th><i class="fas fa-moon"></i> Horas Extras Nocturnas/Feriado (50%)</th>
                    <th><i class="fas fa-check-circle"></i> Estado</th>
                    <th><i class="fas fa-exclamation-circle"></i> Alerta</th>
                    <th><i class="fas fa-edit"></i> Editar</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent}
            </tbody>
            <tfoot>
                ${totalRows}
            </tfoot>
        </table>
    `;

    // Aquí es donde se debe agregar el código para inicializar el estado anterior
    document.querySelectorAll('.status-select').forEach((selectElement) => {
        const currentStatus = selectElement.value;
        selectElement.setAttribute('data-previous-status', currentStatus);
    });

    // Mostrar el resumen
    mostrarResumen();

    // Mostrar los botones de descarga PDF y Excel una vez generado el reporte
    document.getElementById('downloadPdfBtn').style.display = 'block';
    document.getElementById('downloadExcelBtn').style.display = 'block';
}
function redirectToSpecial() {
    window.location.href = "hoemhe.html"; // Redirigir al archivo especificado
}

function captureTotals() {
    let totalDiurnasFormatted = formatTime(totalDiurnasSeconds);
    let totalNocturnasFormatted = formatTime(totalNocturnasSeconds);
    let totalCombinedSeconds = totalDiurnasSeconds + totalNocturnasSeconds;
    let totalCombinedFormatted = formatTime(totalCombinedSeconds);

    let totalRows = `
        <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>${totalDiurnasFormatted}</strong></td>
            <td><strong>${totalNocturnasFormatted}</strong></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Combinado</strong></td>
            <td colspan="2"><strong>${totalCombinedFormatted}</strong></td>
        </tr>
    `;

    document.getElementById('output').innerHTML += `
        <tfoot>
            ${totalRows}
        </tfoot>
    `;
}

// Función para formatear correctamente los segundos a hh:mm:ss
function formatTime(seconds) {
    if (seconds < 0) return "00:00:00"; // Evitar mostrar tiempos negativos

    const hours = Math.floor(seconds / 3600); // Convertir a horas
    const mins = Math.floor((seconds % 3600) / 60); // Convertir a minutos
    const secs = seconds % 60; // Obtener segundos restantes

    // Asegurarse de que cada unidad tenga al menos 2 dígitos
    return [hours, mins, secs]
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
}
function convertirHorasASegundos(horasExtras) {
    if (!horasExtras) return 0;

    const partes = horasExtras.split(':').map(Number);
    const segundos = partes[0] * 3600 + partes[1] * 60 + partes[2];
    return segundos;
}
function updateTotal(selectElement, date, horasExtrasDiurnas, horasExtrasNocturnas) {
    const newStatus = selectElement.value;
    const previousStatus = selectElement.getAttribute('data-previous-status') || "";

    // Convertir horas extras a segundos para poder operar
    const segundosDiurnas = convertirHorasASegundos(horasExtrasDiurnas);
    const segundosNocturnas = convertirHorasASegundos(horasExtrasNocturnas);

    if (previousStatus && previousStatus !== newStatus) {
        // Si el estado cambia, restamos las horas del estado anterior
        actualizarTotales(totals, previousStatus, horasExtrasDiurnas, horasExtrasNocturnas, true);
    }

    // Sumar las horas del nuevo estado
    actualizarTotales(totals, newStatus, horasExtrasDiurnas, horasExtrasNocturnas);

    // Actualizamos el estado anterior con el nuevo estado
    selectElement.setAttribute('data-previous-status', newStatus);

    // Volvemos a generar el resumen
    mostrarResumen();
}
function reinicializarTotales() {
    totals = {
        aprobadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        rechazadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        pendientes: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 }
    };
}
function resetTotals() {
    totals = {
        aprobadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        rechazadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        pendientes: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 }
    };
}
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración de estilos
    const styles = {
        header: { fillColor: [41, 45, 62], textColor: [255, 255, 255], fontSize: 12, fontStyle: 'bold' },
        subheader: { fillColor: [69, 75, 95], textColor: [255, 255, 255], fontSize: 10 },
        cell: { fontSize: 9 },
        warning: { fillColor: [255, 244, 229], textColor: [0, 0, 0] },
        error: { fillColor: [255, 235, 235], textColor: [0, 0, 0] }
    };

    // Título del documento
    doc.setFontSize(16);
    doc.setTextColor(41, 45, 62);
    doc.text('Reporte de Horas Extras', 14, 20);

    // Información del empleado
    const idInput = document.getElementById('idInput').value;
    const monthInput = document.getElementById('monthInput').value;
    const yearInput = document.getElementById('yearInput').value;

    doc.setFontSize(12);
    doc.text(`ID: ${idInput}`, 14, 30);
    doc.text(`Período: ${monthInput}/${yearInput}`, 14, 37);

    // Configuración de la tabla
    const headers = [
        ['Fecha', 'Entrada', 'Salida', 'H.E. Diurnas', 'H.E. Nocturnas', 'Estado', 'Observaciones']
    ];

    // Obtener datos de la tabla web
    const tableData = [];
    const rows = document.querySelectorAll('#output table tbody tr');
    
    rows.forEach(row => {
        if (!row) return; // Skip if row is undefined
        
        const cells = row.querySelectorAll('td');
        if (!cells || cells.length < 7) return; // Skip if not enough cells
        
        const rowData = [];
        
        // Fecha
        rowData.push(cells[0] ? cells[0].textContent.replace(/[^\d/-]/g, '').trim() : '');
        
        // Hora Inicio
        rowData.push(cells[1] ? cells[1].textContent.replace(/[^\d:]/g, '').trim() : '');
        
        // Hora Fin
        rowData.push(cells[2] ? cells[2].textContent.replace(/[^\d:]/g, '').trim() : '');
        
        // H.E. Diurnas
        rowData.push(cells[3] ? cells[3].textContent.replace(/[^\d:]/g, '').trim() : '00:00:00');
        
        // H.E. Nocturnas
        rowData.push(cells[4] ? cells[4].textContent.replace(/[^\d:]/g, '').trim() : '00:00:00');
        
        // Estado
        const select = cells[5] ? cells[5].querySelector('select') : null;
        rowData.push(select ? select.value : (cells[5] ? cells[5].textContent.trim() : 'PENDIENTE'));
        
        // Alerta (eliminar HTML tags)
        const alertText = cells[6] ? cells[6].textContent.replace(/<[^>]*>/g, '').trim() : '';
        rowData.push(alertText);
        
        if (rowData.some(cell => cell !== '')) {
            tableData.push(rowData);
        }
    });

    // Agregar la tabla al PDF
    doc.autoTable({
        head: headers,
        body: tableData,
        startY: 45,
        styles: {
            font: 'helvetica',
            fontSize: styles.cell.fontSize,
            cellPadding: 3
        },
        headStyles: styles.header,
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
            0: { cellWidth: 25 }, // Fecha
            1: { cellWidth: 20 }, // Entrada
            2: { cellWidth: 20 }, // Salida
            3: { cellWidth: 25 }, // H.E. Diurnas
            4: { cellWidth: 25 }, // H.E. Nocturnas
            5: { cellWidth: 25 }, // Estado
            6: { cellWidth: 'auto' } // Observaciones
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                const estado = String(data.cell.text).toLowerCase();
                if (estado.includes('rechazado')) {
                    data.cell.styles.fillColor = styles.error.fillColor;
                } else if (estado.includes('pendiente')) {
                    data.cell.styles.fillColor = styles.warning.fillColor;
                }
            }
        }
    });

    // Agregar resumen
    const finalY = doc.previousAutoTable.finalY || 45;
    doc.setFontSize(12);
    doc.setTextColor(41, 45, 62);
    doc.text('Resumen de Horas', 14, finalY + 10);

    // Preparar datos del resumen
    const resumenData = [
        ['Horas Extras Diurnas', '', '', 'Horas Extras Nocturnas'],
        ['Aprobadas:', formatTime(totals.aprobadas["25%"]), '', 'Aprobadas:', formatTime(totals.aprobadas["50%"])],
        ['Rechazadas:', formatTime(totals.rechazadas["25%"]), '', 'Rechazadas:', formatTime(totals.rechazadas["50%"])],
        ['Pendientes:', formatTime(totals.pendientes["25%"]), '', 'Pendientes:', formatTime(totals.pendientes["50%"])],
        [], // Línea en blanco
        ['Total Diurnas:', formatTime(totalDiurnasSeconds), '', 'Total Nocturnas:', formatTime(totalNocturnasSeconds)],
        [], // Línea en blanco
        ['Total Combinado:', formatTime(totalDiurnasSeconds + totalNocturnasSeconds)]
    ];

    // Agregar tabla de resumen
    doc.autoTable({
        body: resumenData,
        startY: finalY + 15,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            2: { fontStyle: 'bold' }
        }
    });

    // Guardar el PDF
    doc.save(`Reporte_${idInput}_${monthInput}_${yearInput}.pdf`);
}
async function downloadExcel() {
    // Crear un nuevo libro de trabajo
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Configurar el ancho de las columnas
    worksheet.columns = [
        { width: 15 }, // Fecha
        { width: 12 }, // Hora Inicio
        { width: 12 }, // Hora Fin
        { width: 20 }, // H.E. Diurnas
        { width: 20 }, // H.E. Nocturnas
        { width: 15 }, // Estado
        { width: 50 }  // Observaciones
    ];

    // Obtener información del reporte
    const idInput = document.getElementById('idInput').value;
    const monthInput = document.getElementById('monthInput').value;
    const yearInput = document.getElementById('yearInput').value;

    // Estilos para el título
    const titleStyle = {
        font: { size: 16, bold: true, color: { argb: '002060' } },
        alignment: { horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
    };

    // Estilos para subtítulos
    const subtitleStyle = {
        font: { size: 12, bold: true },
        alignment: { horizontal: 'left' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
    };

    // Estilos para encabezados de tabla
    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    };

    // Estilos para datos
    const dataStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    };

    // Título principal
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE DE HORAS EXTRAS';
    Object.assign(titleCell, titleStyle);

    // Información del reporte
    worksheet.mergeCells('A2:G2');
    const idCell = worksheet.getCell('A2');
    idCell.value = `ID: ${idInput}`;
    Object.assign(idCell, subtitleStyle);

    worksheet.mergeCells('A3:G3');
    const periodCell = worksheet.getCell('A3');
    periodCell.value = `Período: ${monthInput}/${yearInput}`;
    Object.assign(periodCell, subtitleStyle);

    // Línea en blanco
    worksheet.addRow([]);

    // Encabezados de la tabla
    const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'H.E. Diurnas (25%)', 'H.E. Nocturnas (50%)', 'Estado', 'Observaciones'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
    });

    // Obtener y agregar datos de la tabla
    const rows = document.querySelectorAll('#output table tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const rowData = [
                cells[0].textContent.replace(/[^\d/-]/g, '').trim(),
                cells[1].textContent.replace(/[^\d:]/g, '').trim(),
                cells[2].textContent.replace(/[^\d:]/g, '').trim(),
                cells[3].textContent.replace(/[^\d:]/g, '').trim(),
                cells[4].textContent.replace(/[^\d:]/g, '').trim(),
                cells[5].querySelector('select') ? cells[5].querySelector('select').value : cells[5].textContent.trim(),
                cells[6].textContent.replace(/<[^>]*>/g, '').trim()
            ];
            const dataRow = worksheet.addRow(rowData);
            dataRow.eachCell((cell) => {
                Object.assign(cell, dataStyle);
                // Colorear estados
                if (cell.col === 6) { // Columna de Estado
                    if (cell.value === 'RECHAZADO') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFCCCB' }
                        };
                    } else if (cell.value === 'PENDIENTE') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE699' }
                        };
                    }
                }
            });
        }
    });

    // Agregar líneas en blanco antes del resumen
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Título del resumen
    const resumenRow = worksheet.addRow(['RESUMEN DE HORAS EXTRAS']);
    worksheet.mergeCells(`A${resumenRow.number}:G${resumenRow.number}`);
    Object.assign(worksheet.getCell(`A${resumenRow.number}`), {
        font: { size: 14, bold: true },
        alignment: { horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFD9' } }
    });

    worksheet.addRow([]); // Línea en blanco

    // Estilos para el resumen
    const resumenStyle = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }
    };

    // Agregar resumen de horas extras diurnas
    worksheet.addRow(['HORAS EXTRAS DIURNAS (25%)']).eachCell(cell => Object.assign(cell, resumenStyle));
    worksheet.addRow(['Aprobadas:', formatTime(totals.aprobadas["25%"])]);
    worksheet.addRow(['Rechazadas:', formatTime(totals.rechazadas["25%"])]);
    worksheet.addRow(['Pendientes:', formatTime(totals.pendientes["25%"])]);
    worksheet.addRow(['Total Diurnas:', formatTime(totalDiurnasSeconds)]);
    worksheet.addRow([]);

    // Agregar resumen de horas extras nocturnas
    worksheet.addRow(['HORAS EXTRAS NOCTURNAS (50%)']).eachCell(cell => Object.assign(cell, resumenStyle));
    worksheet.addRow(['Aprobadas:', formatTime(totals.aprobadas["50%"])]);
    worksheet.addRow(['Rechazadas:', formatTime(totals.rechazadas["50%"])]);
    worksheet.addRow(['Pendientes:', formatTime(totals.pendientes["50%"])]);
    worksheet.addRow(['Total Nocturnas:', formatTime(totalNocturnasSeconds)]);
    worksheet.addRow([]);

    // Total combinado
    const totalRow = worksheet.addRow(['TOTAL COMBINADO:', formatTime(totalDiurnasSeconds + totalNocturnasSeconds)]);
    totalRow.eachCell(cell => {
        Object.assign(cell, {
            font: { size: 12, bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } }
        });
    });

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${idInput}_${monthInput}_${yearInput}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Función para formatear hora para input type="time"
function formatTimeForInput(date) {
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Función para convertir hora de input a Date
function inputTimeToDate(inputTime, baseDate) {
    const [hours, minutes] = inputTime.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

// Función para crear el contenedor de edición de tiempo
function createTimeEditContainer(originalTime, onSave, onCancel) {
    const container = document.createElement('div');
    container.className = 'time-edit-container';
    
    const input = document.createElement('input');
    input.type = 'time';
    input.className = 'time-input';
    input.value = formatTimeForInput(originalTime);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'time-edit-buttons';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'time-edit-btn save';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.onclick = () => onSave(input.value);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'time-edit-btn cancel';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.onclick = onCancel;
    
    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(cancelBtn);
    container.appendChild(input);
    container.appendChild(buttonsContainer);
    
    return container;
}

// Función para obtener las marcas disponibles para un día específico
function getAvailableMarks(date, currentId) {
    // Convertir la fecha de entrada a medianoche
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // Obtener el día siguiente
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Obtener el día anterior
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    prevDate.setHours(20, 0, 0, 0); // Comenzar desde las 20:00 del día anterior
    
    // Filtrar las marcas
    const availableMarks = data.filter(item => {
        if (item.id !== currentId) return false;
        
        const markDate = new Date(item.timestamp);
        
        // Incluir marcas desde las 20:00 del día anterior hasta las 12:00 del día siguiente
        return markDate >= prevDate && markDate <= nextDate;
    });

    // Ordenar las marcas por fecha
    availableMarks.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return availableMarks;
}

// Función para crear el selector de marcas
function createMarksSelector(date, currentId, onSelect, onCancel) {
    const container = document.createElement('div');
    container.className = 'marks-selector';
    
    const marks = getAvailableMarks(date, currentId);
    
    if (marks.length === 0) {
        container.innerHTML = '<div class="alert-text warning"><i class="fas fa-exclamation-triangle"></i> No hay marcas disponibles para este día</div>';
        return container;
    }
    
    const marksList = document.createElement('div');
    marksList.className = 'marks-list';
    
    // Fecha actual a medianoche para comparar
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // Fecha del día siguiente a medianoche
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Fecha del día anterior a medianoche
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    marks.forEach(mark => {
        const markDate = new Date(mark.timestamp);
        let timeLabel = '';
        
        // Determinar si la marca es del día anterior, actual o siguiente
        if (markDate < currentDate) {
            timeLabel = '(Día anterior) ';
        } else if (markDate >= nextDate) {
            timeLabel = '(Día siguiente) ';
        }
        
        const markItem = document.createElement('div');
        markItem.className = 'mark-item';
        markItem.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>${timeLabel}${markDate.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            })}</span>
        `;
        markItem.onclick = () => {
            onSelect(mark.timestamp);
            marksList.querySelectorAll('.mark-item').forEach(item => item.classList.remove('selected'));
            markItem.classList.add('selected');
        };
        marksList.appendChild(markItem);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'time-edit-btn cancel';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    cancelBtn.onclick = onCancel;
    
    container.appendChild(marksList);
    container.appendChild(cancelBtn);
    
    return container;
}

// Función para habilitar la edición de una fila
function enableRowEdit(row) {
    const entryCell = row.querySelector('td:nth-child(2)');
    const exitCell = row.querySelector('td:nth-child(3)');
    const date = new Date(row.querySelector('td:nth-child(1)').textContent);
    const currentId = parseInt(document.getElementById('idInput').value);
    
    const originalEntryTime = new Date(entryCell.dataset.timestamp);
    const originalExitTime = new Date(exitCell.dataset.timestamp);
    
    // Guardar contenido original
    const originalEntryContent = entryCell.innerHTML;
    const originalExitContent = exitCell.innerHTML;
    
    // Crear contenedor de acciones
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'time-edit-actions';
    
    // Botón de edición manual
    const manualBtn = document.createElement('button');
    manualBtn.className = 'time-edit-btn manual';
    manualBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Manual';
    manualBtn.onclick = () => {
        entryCell.innerHTML = '';
        entryCell.appendChild(createTimeEditContainer(originalEntryTime, 
            (newTime) => {
                const newDate = inputTimeToDate(newTime, originalEntryTime);
                entryCell.dataset.timestamp = newDate.toISOString();
                entryCell.innerHTML = formatTime(newDate);
                row.classList.add('edit-mode');
                reprocessDay(row);
            },
            () => {
                entryCell.innerHTML = originalEntryContent;
            }
        ));
        
        exitCell.innerHTML = '';
        exitCell.appendChild(createTimeEditContainer(originalExitTime,
            (newTime) => {
                const newDate = inputTimeToDate(newTime, originalExitTime);
                exitCell.dataset.timestamp = newDate.toISOString();
                exitCell.innerHTML = formatTime(newDate);
                row.classList.add('edit-mode');
                reprocessDay(row);
            },
            () => {
                exitCell.innerHTML = originalExitContent;
            }
        ));
    };
    
    // Botón de selección de marcas
    const marksBtn = document.createElement('button');
    marksBtn.className = 'time-edit-btn marks';
    marksBtn.innerHTML = '<i class="fas fa-list"></i> Seleccionar Marcas';
    marksBtn.onclick = () => {
        entryCell.innerHTML = '';
        entryCell.appendChild(createMarksSelector(date, currentId,
            (timestamp) => {
                entryCell.dataset.timestamp = timestamp.toISOString();
                entryCell.innerHTML = formatTime(timestamp);
                row.classList.add('edit-mode');
                reprocessDay(row);
            },
            () => {
                entryCell.innerHTML = originalEntryContent;
            }
        ));
        
        exitCell.innerHTML = '';
        exitCell.appendChild(createMarksSelector(date, currentId,
            (timestamp) => {
                exitCell.dataset.timestamp = timestamp.toISOString();
                exitCell.innerHTML = formatTime(timestamp);
                row.classList.add('edit-mode');
                reprocessDay(row);
            },
            () => {
                exitCell.innerHTML = originalExitContent;
            }
        ));
    };
    
    // Botón de cancelar
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'time-edit-btn cancel';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    cancelBtn.onclick = () => {
        entryCell.innerHTML = originalEntryContent;
        exitCell.innerHTML = originalExitContent;
    };
    
    actionsContainer.appendChild(manualBtn);
    actionsContainer.appendChild(marksBtn);
    actionsContainer.appendChild(cancelBtn);
    
    // Reemplazar contenido
    entryCell.innerHTML = '';
    entryCell.appendChild(actionsContainer);
    
    exitCell.innerHTML = '';
    exitCell.appendChild(actionsContainer.cloneNode(true));
}

// Función para reprocesar un día específico
function reprocessDay(row) {
    const date = new Date(row.querySelector('td:nth-child(1)').textContent);
    const entryTime = new Date(row.querySelector('td:nth-child(2)').dataset.timestamp);
    const exitTime = new Date(row.querySelector('td:nth-child(3)').dataset.timestamp);
    
    // Calcular horas extras para el día
    const horasExtras = calcularHorasExtras(entryTime, exitTime);
    
    // Actualizar la fila con los nuevos cálculos
    updateRowWithCalculations(row, horasExtras);
}

// Función para actualizar una fila con los nuevos cálculos
function updateRowWithCalculations(row, horasExtras) {
    const diurnasCell = row.querySelector('td:nth-child(4)');
    const nocturnasCell = row.querySelector('td:nth-child(5)');
    const totalCell = row.querySelector('td:nth-child(6)');
    
    diurnasCell.textContent = formatTime(horasExtras.diurnalSeconds);
    nocturnasCell.textContent = formatTime(horasExtras.nocturnalSeconds);
    totalCell.textContent = formatTime(horasExtras.workSeconds);
    
    // Actualizar alertas si es necesario
    updateRowAlerts(row, horasExtras);
}

async function loadData() {
    try {
        const data = await loadSecureData();
        if (data) {
            return data;
        } else {
            console.error('No se pudieron cargar los datos');
            return [];
        }
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        return [];
    }
}






