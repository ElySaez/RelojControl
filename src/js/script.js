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
function calcularHorasExtras(entrada, salida) {
    if (!entrada || !salida || entrada.getTime() === salida.getTime() || salida <= entrada) {
        return {
            diurnalSeconds: 0,
            nocturnalSeconds: 0,
            alertMessage: `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i><span>Error: ${!entrada ? 'Falta marca de entrada' : !salida ? 'Falta marca de salida' : 'Marcas inválidas'}</span></div>`
        };
    }

    // Si es día no laborable, todas las horas se calculan al 50%
    if (esFeriado(entrada)) {
        const diffSeconds = Math.floor((salida - entrada) / 1000);
        return {
            diurnalSeconds: 0,
            nocturnalSeconds: diffSeconds,
            alertMessage: `<div class="alert alert-info"><i class="fas fa-info-circle"></i><span>Día no laborable - Todas las horas se calculan al 50%</span></div>`
        };
    }

    // Fecha a partir de la cual se aplica la flexibilidad horaria
    const fechaInicio = new Date('2025-03-03');
    const aplicarFlexibilidad = entrada >= fechaInicio;

    let horaSalidaEsperada = null;
    let horaEntradaEsperada = null;
    let mensajeFlexibilidad = '';

    // Verificar si la entrada está entre las 6:00 y 7:59
    const horaEntrada = entrada.getHours();
    const minutoEntrada = entrada.getMinutes();
    const entradaTemprana = horaEntrada >= 6 && horaEntrada < 8;

    if (aplicarFlexibilidad) {
        // Definir los límites de la flexibilidad horaria
        const horaEntradaMinima = new Date(entrada);
        horaEntradaMinima.setHours(8, 0, 0, 0);
        
        const horaEntradaMaxima = new Date(entrada);
        horaEntradaMaxima.setHours(9, 0, 0, 0);

        if (entradaTemprana) {
            // Si entró entre 6:00 y 7:59, usar las 8:00 como hora de entrada
            horaEntradaEsperada = new Date(entrada);
            horaEntradaEsperada.setHours(8, 0, 0, 0);
            horaSalidaEsperada = new Date(entrada);
            horaSalidaEsperada.setHours(17, 0, 0, 0);
            mensajeFlexibilidad = `<div class="alert alert-info"><i class="fas fa-clock"></i><span>Entrada temprana. Se considera desde las 08:00. Hora de salida esperada: 17:00</span></div>`;
        } else {
            // Verificar si la entrada está dentro del rango de flexibilidad
            const entradaDentroDeFlexibilidad = entrada >= horaEntradaMinima && entrada <= horaEntradaMaxima;
            
            if (entradaDentroDeFlexibilidad) {
                // Calcular la hora de salida sumando 9 horas a la hora de entrada
                horaSalidaEsperada = new Date(entrada.getTime() + (9 * 60 * 60 * 1000)); // 9 horas en milisegundos
                horaEntradaEsperada = entrada;
                
                mensajeFlexibilidad = `<div class="alert alert-info"><i class="fas fa-clock"></i><span>Se aplicó flexibilidad horaria. Hora de salida esperada: ${horaSalidaEsperada.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</span></div>`;
            } else {
                // Si está fuera del rango de flexibilidad, usar la hora normal (8:33 - 17:33)
                horaEntradaEsperada = new Date(entrada);
                horaEntradaEsperada.setHours(8, 33, 0, 0);
                horaSalidaEsperada = new Date(entrada);
                horaSalidaEsperada.setHours(17, 33, 0, 0);
            }
        }
    } else {
        // Para fechas anteriores al 03/03/2025
        if (entradaTemprana) {
            // Si entró entre 6:00 y 7:59, usar las 8:33 como hora de entrada
            horaEntradaEsperada = new Date(entrada);
            horaEntradaEsperada.setHours(8, 33, 0, 0);
            horaSalidaEsperada = new Date(entrada);
            horaSalidaEsperada.setHours(17, 33, 0, 0);
            mensajeFlexibilidad = `<div class="alert alert-info"><i class="fas fa-clock"></i><span>Entrada temprana. Se considera desde las 08:33. Hora de salida esperada: 17:33</span></div>`;
        } else {
            // Usar el horario fijo (8:33 - 17:33)
            horaEntradaEsperada = new Date(entrada);
            horaEntradaEsperada.setHours(8, 33, 0, 0);
            horaSalidaEsperada = new Date(entrada);
            horaSalidaEsperada.setHours(17, 33, 0, 0);
        }
    }

    // Si la entrada es después de la hora esperada, usar la hora real de entrada
    const entradaParaCalculo = entrada > horaEntradaEsperada ? entrada : horaEntradaEsperada;
    
    // Si no cumple con las horas requeridas
    if (salida < horaSalidaEsperada) {
        return {
            diurnalSeconds: 0,
            nocturnalSeconds: 0,
            alertMessage: `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i><span>No se completó la jornada laboral requerida. Se requiere salir a las ${horaSalidaEsperada.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            })}</span></div>`
        };
    }

    // Calcular la diferencia en segundos desde la hora de salida esperada
    const diffSeconds = Math.floor((salida - horaSalidaEsperada) / 1000);
    
    if (diffSeconds <= 0) {
        return {
            diurnalSeconds: 0,
            nocturnalSeconds: 0,
            alertMessage: mensajeFlexibilidad || ''
        };
    }

    let diurnalSeconds = 0;
    let nocturnalSeconds = 0;
    let current = new Date(horaSalidaEsperada);

    while (current < salida) {
        const hour = current.getHours();
        const secondsToAdd = Math.min(3600, Math.floor((salida - current) / 1000));
        if (hour >= 22 || hour < 6) {
            nocturnalSeconds += secondsToAdd;
        } else {
            diurnalSeconds += secondsToAdd;
        }
        current.setHours(current.getHours() + 1);
    }

    return {
        diurnalSeconds,
        nocturnalSeconds,
        alertMessage: mensajeFlexibilidad
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
    // Totales individuales por estado y porcentaje
    const totalAprobadasDiurnas = totals.aprobadas["25%"];
    const totalAprobadasNocturnas = totals.aprobadas["50%"];
    const totalRechazadasDiurnas = totals.rechazadas["25%"];
    const totalRechazadasNocturnas = totals.rechazadas["50%"];
    const totalPendientesDiurnas = totals.pendientes["25%"];
    const totalPendientesNocturnas = totals.pendientes["50%"];

    // Calcular totales por estado
    const totalAprobadas = totalAprobadasDiurnas + totalAprobadasNocturnas;
    const totalRechazadas = totalRechazadasDiurnas + totalRechazadasNocturnas;
    const totalPendientes = totalPendientesDiurnas + totalPendientesNocturnas;

    // Calcular total general (solo aprobadas - rechazadas)
    const totalGeneral = totalAprobadas - totalRechazadas;

    // Formatear todos los valores
    const formatearHoras = {
        aprobadasDiurnas: formatTime(totalAprobadasDiurnas),
        aprobadasNocturnas: formatTime(totalAprobadasNocturnas),
        aprobadasTotal: formatTime(totalAprobadas),
        rechazadasDiurnas: formatTime(totalRechazadasDiurnas),
        rechazadasNocturnas: formatTime(totalRechazadasNocturnas),
        rechazadasTotal: formatTime(totalRechazadas),
        pendientesDiurnas: formatTime(totalPendientesDiurnas),
        pendientesNocturnas: formatTime(totalPendientesNocturnas),
        pendientesTotal: formatTime(totalPendientes),
        totalGeneral: formatTime(totalGeneral)
    };

    // Mostrar el resumen en el contenedor HTML
    document.getElementById('resumen-container').innerHTML = `
        <h3>Resumen de Horas</h3>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Estado</th>
                    <th>H.E. 25%</th>
                    <th>H.E. 50%</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Aprobadas</strong></td>
                    <td>${formatearHoras.aprobadasDiurnas}</td>
                    <td>${formatearHoras.aprobadasNocturnas}</td>
                    <td><strong>${formatearHoras.aprobadasTotal}</strong></td>
                </tr>
                <tr>
                    <td><strong>Rechazadas</strong></td>
                    <td>${formatearHoras.rechazadasDiurnas}</td>
                    <td>${formatearHoras.rechazadasNocturnas}</td>
                    <td><strong>${formatearHoras.rechazadasTotal}</strong></td>
                </tr>
                <tr>
                    <td><strong>Pendientes</strong></td>
                    <td>${formatearHoras.pendientesDiurnas}</td>
                    <td>${formatearHoras.pendientesNocturnas}</td>
                    <td><strong>${formatearHoras.pendientesTotal}</strong></td>
                </tr>
                <tr class="table-total">
                    <td><strong>Total General</strong></td>
                    <td colspan="3"><strong>${formatearHoras.totalGeneral}</strong></td>
                </tr>
            </tbody>
        </table>
    `;

    // Para depuración: mostrar en consola los valores totales
    console.log("Resumen de Horas Extras:");
    console.log("Aprobadas 25%:", formatearHoras.aprobadasDiurnas);
    console.log("Aprobadas 50%:", formatearHoras.aprobadasNocturnas);
    console.log("Rechazadas 25%:", formatearHoras.rechazadasDiurnas);
    console.log("Rechazadas 50%:", formatearHoras.rechazadasNocturnas);
    console.log("Pendientes 25%:", formatearHoras.pendientesDiurnas);
    console.log("Pendientes 50%:", formatearHoras.pendientesNocturnas);
    console.log("Total General (Aprobadas - Rechazadas):", formatearHoras.totalGeneral);
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
            dailyData[dateKey] = {
                id: item.id,
                date: dateKey,
                startTime: timestamp,
                endTime: timestamp,
                autoAssigned: false
            };
        } else {
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

        if (record.startTime.getTime() === record.endTime.getTime()) {
            alertMessage = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i><span>Error: Falta marcación de entrada o salida</span></div>`;
            alertClass = 'alerta-horas';
        } else {
            let { diurnalSeconds, nocturnalSeconds, alertMessage: extraAlertMessage } = calcularHorasExtras(record.startTime, record.endTime);

            diurnalFormatted = formatTime(diurnalSeconds);
            nocturnalFormatted = formatTime(nocturnalSeconds);

            totalDiurnasSeconds += diurnalSeconds;
            totalNocturnasSeconds += nocturnalSeconds;

            if (extraAlertMessage) {
                alertMessage = extraAlertMessage;
            }
        }

        // Formatear la fecha para mostrarla en formato dd/mm/yyyy
        const formattedDate = record.startTime.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        tableContent += `
            <tr class="${alertClass}">
                <td>${formattedDate}</td>
                <td data-timestamp="${record.startTime.toISOString()}">${startTimeFormatted}</td>
                <td data-timestamp="${record.endTime.toISOString()}">${endTimeFormatted}</td>
                <td>${diurnalFormatted}</td>
                <td>${nocturnalFormatted}</td>
                <td>
                    <select class="status-select" onchange="updateTotal(this, '${date}', '${diurnalFormatted}', '${nocturnalFormatted}')">
                        <option value="AUTORIZADO">AUTORIZADO</option>
                        <option value="RECHAZADO">RECHAZADO</option>
                        <option value="PENDIENTE">PENDIENTE</option>
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

    // Añadir las filas de totales
    let totalRows = `
        <tr>
            <td colspan="3">Total</td>
            <td>${totalDiurnasFormatted}</td>
            <td>${totalNocturnasFormatted}</td>
            <td colspan="3"></td>
        </tr>
        <tr>
            <td colspan="3">Total Combinado</td>
            <td colspan="5">${totalCombinedFormatted}</td>
        </tr>
    `;

    // Obtener el ID y período para el título del reporte
    const idInput = document.getElementById('idInput').value;
    const monthInput = document.getElementById('monthInput').value.padStart(2, '0');
    const yearInput = document.getElementById('yearInput').value;

    // Mostrar el contenido de la tabla en el DOM
    document.getElementById('output').innerHTML = `
        <div class="report-header">
            <h2>Reporte de Horas Extras</h2>
            <div class="report-info">
                <p>ID: ${idInput}</p>
                <p>Período: ${monthInput}/${yearInput}</p>
            </div>
        </div>
        <table class="table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>H.E. Diurnas</th>
                    <th>H.E. Nocturnas</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                    <th>Editar</th>
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

    // Inicializar el estado anterior de los selectores
    document.querySelectorAll('.status-select').forEach((selectElement) => {
        const currentStatus = selectElement.value;
        selectElement.setAttribute('data-previous-status', currentStatus);
    });

    // Mostrar el resumen
    mostrarResumen();

    // Mostrar los botones de descarga PDF y Excel
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

    // Si el estado anterior era RECHAZADO y cambia a otro estado, sumamos las horas
    if (previousStatus === "RECHAZADO" && newStatus !== "RECHAZADO") {
        // Restar del total de rechazadas
        actualizarTotales(totals, "RECHAZADO", horasExtrasDiurnas, horasExtrasNocturnas, true);
        // Sumar al nuevo estado
        actualizarTotales(totals, newStatus, horasExtrasDiurnas, horasExtrasNocturnas, false);
    }
    // Si el nuevo estado es RECHAZADO y el anterior era otro estado, restamos las horas
    else if (newStatus === "RECHAZADO" && previousStatus !== "RECHAZADO") {
        // Restar del estado anterior
        if (previousStatus) {
            actualizarTotales(totals, previousStatus, horasExtrasDiurnas, horasExtrasNocturnas, true);
        }
        // Sumar a rechazadas
        actualizarTotales(totals, "RECHAZADO", horasExtrasDiurnas, horasExtrasNocturnas, false);
    }
    // Si ambos estados son diferentes pero ninguno es RECHAZADO
    else if (previousStatus && previousStatus !== newStatus) {
        // Restar del estado anterior
        actualizarTotales(totals, previousStatus, horasExtrasDiurnas, horasExtrasNocturnas, true);
        // Sumar al nuevo estado
        actualizarTotales(totals, newStatus, horasExtrasDiurnas, horasExtrasNocturnas, false);
    }
    // Si no había estado anterior, simplemente sumamos al nuevo estado
    else if (!previousStatus) {
        actualizarTotales(totals, newStatus, horasExtrasDiurnas, horasExtrasNocturnas, false);
    }

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
        cell: { fontSize: 9 }
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
        ['Fecha', 'Entrada', 'Salida', 'H.E. 25%', 'H.E. 50%', 'Estado', 'Observaciones']
    ];

    // Obtener datos de la tabla web
    const tableData = [];
    const rows = document.querySelectorAll('#output table tbody tr');
    
    rows.forEach(row => {
        if (!row) return;
        
        const cells = row.querySelectorAll('td');
        if (!cells || cells.length < 7) return;
        
        const rowData = [];
        
        // Fecha
        rowData.push(cells[0] ? cells[0].textContent.trim() : '');
        
        // Hora Inicio
        rowData.push(cells[1] ? cells[1].textContent.trim() : '');
        
        // Hora Fin
        rowData.push(cells[2] ? cells[2].textContent.trim() : '');
        
        // H.E. 25%
        rowData.push(cells[3] ? cells[3].textContent.trim() : '00:00:00');
        
        // H.E. 50%
        rowData.push(cells[4] ? cells[4].textContent.trim() : '00:00:00');
        
        // Estado
        const select = cells[5] ? cells[5].querySelector('select') : null;
        rowData.push(select ? select.value : (cells[5] ? cells[5].textContent.trim() : 'PENDIENTE'));
        
        // Observaciones (eliminar HTML tags)
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
        headStyles: {
            fillColor: [0, 102, 255],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 25 }, // Fecha
            1: { cellWidth: 20 }, // Entrada
            2: { cellWidth: 20 }, // Salida
            3: { cellWidth: 25 }, // H.E. 25%
            4: { cellWidth: 25 }, // H.E. 50%
            5: { cellWidth: 25 }, // Estado
            6: { cellWidth: 'auto' } // Observaciones
        }
    });

    // Agregar resumen
    const finalY = doc.previousAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.setTextColor(41, 45, 62);
    doc.text('Resumen de Horas', 14, finalY + 15);

    // Preparar datos del resumen
    const resumenHeaders = [['Estado', 'H.E. 25%', 'H.E. 50%', 'Total']];
    
    // Calcular totales
    const totalAprobadas = totals.aprobadas["25%"] + totals.aprobadas["50%"];
    const totalRechazadas = totals.rechazadas["25%"] + totals.rechazadas["50%"];
    const totalPendientes = totals.pendientes["25%"] + totals.pendientes["50%"];
    
    const resumenData = [
        ['Aprobadas', formatTime(totals.aprobadas["25%"]), formatTime(totals.aprobadas["50%"]), 
         formatTime(totalAprobadas)],
        ['Rechazadas', formatTime(totals.rechazadas["25%"]), formatTime(totals.rechazadas["50%"]), 
         formatTime(totalRechazadas)],
        ['Pendientes', formatTime(totals.pendientes["25%"]), formatTime(totals.pendientes["50%"]), 
         formatTime(totalPendientes)]
    ];

    // Total general (solo aprobadas - rechazadas)
    const totalGeneral = totalAprobadas - totalRechazadas;
    resumenData.push(['Total General', '', '', formatTime(totalGeneral)]);

    // Agregar tabla de resumen
    doc.autoTable({
        head: resumenHeaders,
        body: resumenData,
        startY: finalY + 20,
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        headStyles: {
            fillColor: [0, 102, 255],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            3: { fontStyle: 'bold' }
        }
    });

    // Guardar el PDF
    doc.save(`Reporte_${idInput}_${monthInput}_${yearInput}.pdf`);
}
async function downloadExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Configurar el ancho de las columnas
    worksheet.columns = [
        { width: 15 }, // Fecha
        { width: 12 }, // Entrada
        { width: 12 }, // Salida
        { width: 15 }, // H.E. 25%
        { width: 15 }, // H.E. 50%
        { width: 15 }, // Estado
        { width: 40 }  // Observaciones
    ];

    // Obtener información del reporte
    const idInput = document.getElementById('idInput').value;
    const monthInput = document.getElementById('monthInput').value;
    const yearInput = document.getElementById('yearInput').value;

    // Título principal
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE DE HORAS EXTRAS';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Información del reporte
    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `ID: ${idInput}`;
    worksheet.getCell('A2').font = { size: 12, bold: true };

    worksheet.mergeCells('A3:G3');
    worksheet.getCell('A3').value = `Período: ${monthInput}/${yearInput}`;
    worksheet.getCell('A3').font = { size: 12, bold: true };

    // Encabezados de la tabla
    const headers = ['Fecha', 'Entrada', 'Salida', 'H.E. 25%', 'H.E. 50%', 'Estado', 'Observaciones'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '0066FF' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center' };
    });

    // Obtener y agregar datos de la tabla
    const rows = document.querySelectorAll('#output table tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const rowData = [
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].querySelector('select') ? cells[5].querySelector('select').value : cells[5].textContent.trim(),
                cells[6].textContent.replace(/<[^>]*>/g, '').trim()
            ];
            const excelRow = worksheet.addRow(rowData);
            excelRow.eachCell((cell) => {
                cell.alignment = { horizontal: 'center' };
            });
        }
    });

    // Agregar espacio antes del resumen
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Resumen de Horas
    const resumenTitle = worksheet.addRow(['Resumen de Horas']);
    resumenTitle.font = { size: 14, bold: true };

    // Encabezados del resumen
    const resumenHeaders = ['Estado', 'H.E. 25%', 'H.E. 50%', 'Total'];
    const resumenHeaderRow = worksheet.addRow(resumenHeaders);
    resumenHeaderRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '0066FF' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center' };
    });

    // Calcular totales
    const totalAprobadas = totals.aprobadas["25%"] + totals.aprobadas["50%"];
    const totalRechazadas = totals.rechazadas["25%"] + totals.rechazadas["50%"];
    const totalPendientes = totals.pendientes["25%"] + totals.pendientes["50%"];

    // Datos del resumen
    const resumenData = [
        ['Aprobadas', formatTime(totals.aprobadas["25%"]), formatTime(totals.aprobadas["50%"]), 
         formatTime(totalAprobadas)],
        ['Rechazadas', formatTime(totals.rechazadas["25%"]), formatTime(totals.rechazadas["50%"]), 
         formatTime(totalRechazadas)],
        ['Pendientes', formatTime(totals.pendientes["25%"]), formatTime(totals.pendientes["50%"]), 
         formatTime(totalPendientes)]
    ];

    resumenData.forEach(rowData => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell) => {
            cell.alignment = { horizontal: 'center' };
        });
    });

    // Total General (solo aprobadas - rechazadas)
    const totalGeneral = totalAprobadas - totalRechazadas;
    const totalRow = worksheet.addRow(['Total General', '', '', formatTime(totalGeneral)]);
    totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E2EFD9' }
        };
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






