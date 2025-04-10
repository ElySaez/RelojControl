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
                horaEntradaEsperada = entrada;
                // Calcular la hora de salida sumando 9 horas a la hora de entrada
                horaSalidaEsperada = new Date(entrada.getTime() + (9 * 60 * 60 * 1000));
                mensajeFlexibilidad = `<div class="alert alert-info"><i class="fas fa-clock"></i><span>Se aplicó flexibilidad horaria. Hora de salida esperada: ${horaSalidaEsperada.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</span></div>`;
            } else {
                // Si está fuera del rango de flexibilidad, usar la hora normal
                horaEntradaEsperada = new Date(entrada);
                horaEntradaEsperada.setHours(8, 33, 0, 0);
                horaSalidaEsperada = new Date(entrada);
                horaSalidaEsperada.setHours(17, 33, 0, 0);
            }
        }
    } else {
        // Para fechas anteriores al 03/03/2025
        if (entradaTemprana) {
            horaEntradaEsperada = new Date(entrada);
            horaEntradaEsperada.setHours(8, 33, 0, 0);
            horaSalidaEsperada = new Date(entrada);
            horaSalidaEsperada.setHours(17, 33, 0, 0);
            mensajeFlexibilidad = `<div class="alert alert-info"><i class="fas fa-clock"></i><span>Entrada temprana. Se considera desde las 08:33. Hora de salida esperada: 17:33</span></div>`;
        } else {
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

    let diurnalSeconds = 0;
    let nocturnalSeconds = 0;

    // Calcular las horas extras después de la jornada normal
    let current = new Date(horaSalidaEsperada);
    const end = new Date(salida);

    // Establecer el límite de las 21:00 para el mismo día
    const limiteDiurno = new Date(current);
    limiteDiurno.setHours(21, 0, 0, 0);

    // Si la salida es después de las 21:00, calcular primero las horas diurnas hasta las 21:00
    if (end > limiteDiurno && current < limiteDiurno) {
        diurnalSeconds = Math.floor((limiteDiurno - current) / 1000);
        current = new Date(limiteDiurno);
    } else if (end <= limiteDiurno) {
        // Si la salida es antes de las 21:00, todas son diurnas
        diurnalSeconds = Math.floor((end - current) / 1000);
        current = new Date(end);
    }

    // Si aún hay tiempo por calcular después de las 21:00, es nocturno
    if (current < end) {
        nocturnalSeconds = Math.floor((end - current) / 1000);
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

    // Calcular total general (suma de todas las horas)
    const totalGeneral = totalAprobadas + totalRechazadas + totalPendientes;

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
        <div class="card mb-4 shadow">
            <div class="card-header bg-primary text-white py-3">
                <h3 class="mb-0" style="font-size: 1.5rem; font-weight: 600;">
                    <i class="fas fa-clock mr-2"></i>Resumen de Horas
                </h3>
            </div>
            <div class="card-body">
                <table class="table table-bordered table-hover">
                    <thead class="bg-primary text-white">
                        <tr>
                            <th>Estado</th>
                            <th>H.E. 25%</th>
                            <th>H.E. 50%</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="bg-light"><strong>Aprobadas</strong></td>
                            <td>${formatearHoras.aprobadasDiurnas}</td>
                            <td>${formatearHoras.aprobadasNocturnas}</td>
                            <td class="bg-success text-white"><strong>${formatearHoras.aprobadasTotal}</strong></td>
                        </tr>
                        <tr>
                            <td class="bg-light"><strong>Rechazadas</strong></td>
                            <td>${formatearHoras.rechazadasDiurnas}</td>
                            <td>${formatearHoras.rechazadasNocturnas}</td>
                            <td class="bg-danger text-white"><strong>${formatearHoras.rechazadasTotal}</strong></td>
                        </tr>
                        <tr>
                            <td class="bg-light"><strong>Pendientes</strong></td>
                            <td>${formatearHoras.pendientesDiurnas}</td>
                            <td>${formatearHoras.pendientesNocturnas}</td>
                            <td class="bg-warning text-dark"><strong>${formatearHoras.pendientesTotal}</strong></td>
                        </tr>
                        <tr class="table-total">
                            <td colspan="3" class="bg-dark text-white text-right"><strong>Total General:</strong></td>
                            <td class="bg-dark text-white"><strong style="font-size: 1.2rem;">${formatearHoras.totalGeneral}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Para depuración: mostrar en consola los valores totales
    console.log("Resumen de Horas Extras:");
    console.log("Aprobadas 25%:", formatearHoras.aprobadasDiurnas);
    console.log("Aprobadas 50%:", formatearHoras.aprobadasNocturnas);
    console.log("Rechazadas 25%:", formatearHoras.rechazadasDiurnas);
    console.log("Rechazadas 50%:", formatearHoras.rechazadasNocturnas);
    console.log("Pendientes 25%:", formatearHoras.pendientesDiurnas);
    console.log("Pendientes 50%:", formatearHoras.pendientesNocturnas);
    console.log("Total General (Suma de todas las horas):", formatearHoras.totalGeneral);
}
function generateReport(filteredData) {
    // Reiniciar los totales al generar un nuevo reporte
    totalDiurnasSeconds = 0;
    totalNocturnasSeconds = 0;
    
    let dailyData = {};
    let usedMarks = new Set(); // Para rastrear las marcas ya utilizadas

    // Ordenar los datos por fecha y hora
    filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Primera pasada: procesar las marcas normales y las salidas de madrugada
    filteredData.forEach((item, index) => {
        const timestamp = new Date(item.timestamp);
        const dateKey = timestamp.toLocaleDateString();
        const hour = timestamp.getHours();

        // Si es una marca entre 00:00 y 04:00, verificar si pertenece al día anterior
        if (hour >= 0 && hour < 4) {
            const prevDate = new Date(timestamp);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateKey = prevDate.toLocaleDateString();

            // Si existe un registro del día anterior sin marca de salida
            if (dailyData[prevDateKey] && 
                dailyData[prevDateKey].endTime.getTime() === dailyData[prevDateKey].startTime.getTime()) {
                dailyData[prevDateKey].endTime = timestamp;
                dailyData[prevDateKey].autoAssigned = true;
                usedMarks.add(timestamp.getTime()); // Marcar como utilizada
                return; // Saltar al siguiente registro
            }
        }

        // Si la marca no ha sido utilizada como salida de madrugada
        if (!usedMarks.has(timestamp.getTime())) {
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    id: item.id,
                    date: dateKey,
                    startTime: timestamp,
                    endTime: timestamp,
                    autoAssigned: false
                };
            } else {
                // Solo actualizar si la marca no ha sido utilizada
                if (timestamp < dailyData[dateKey].startTime) {
                    dailyData[dateKey].startTime = timestamp;
                }
                if (timestamp > dailyData[dateKey].endTime) {
                    dailyData[dateKey].endTime = timestamp;
                }
            }
        }

        // Si es el último registro del día y no hay marca de salida,
        // buscar si hay una marca temprana al día siguiente
        if (index === filteredData.length - 1 || 
            new Date(filteredData[index + 1].timestamp).toLocaleDateString() !== dateKey) {
            
            if (dailyData[dateKey] && dailyData[dateKey].endTime.getTime() === dailyData[dateKey].startTime.getTime()) {
                // Buscar una marca temprana al día siguiente que no haya sido utilizada
                const nextDay = new Date(timestamp);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayKey = nextDay.toLocaleDateString();
                
                const nextDayFirstMark = filteredData.find(record => {
                    const recordDate = new Date(record.timestamp);
                    return recordDate.toLocaleDateString() === nextDayKey &&
                           recordDate.getHours() >= 0 &&
                           recordDate.getHours() < 4 &&
                           !usedMarks.has(recordDate.getTime());
                });

                if (nextDayFirstMark) {
                    const nextMarkTime = new Date(nextDayFirstMark.timestamp);
                    dailyData[dateKey].endTime = nextMarkTime;
                    dailyData[dateKey].autoAssigned = true;
                    usedMarks.add(nextMarkTime.getTime());
                }
            }
        }
    });

    // Segunda pasada: limpiar registros que solo tienen marca de entrada igual a la salida
    // y esa marca ya fue utilizada como salida del día anterior
    for (let dateKey in dailyData) {
        const record = dailyData[dateKey];
        if (record.startTime.getTime() === record.endTime.getTime() &&
            usedMarks.has(record.startTime.getTime())) {
            delete dailyData[dateKey];
        }
    }

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

            // Combinar mensajes si es necesario
            let messages = [];
            
            if (record.autoAssigned) {
                messages.push(`<div class="alert alert-info"><i class="fas fa-info-circle"></i><span>Se asignó automáticamente la marca de salida de la madrugada siguiente</span></div>`);
            }
            
            if (extraAlertMessage) {
                messages.push(extraAlertMessage);
            }

            alertMessage = messages.join('');
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

    // Total general (suma de todas las horas)
    const totalGeneral = totalAprobadas + totalRechazadas + totalPendientes;
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

    // Total General (suma de todas las horas)
    const totalGeneral = totalAprobadas + totalRechazadas + totalPendientes;
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

// Función para crear la ventana modal de edición
function createEditModal(row) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Obtener la fecha de la fila que se está editando
    const editDateCell = row.querySelector('td:nth-child(1)');
    const editDateParts = editDateCell.textContent.split('/');
    const editDate = new Date(editDateParts[2], editDateParts[1] - 1, editDateParts[0]);

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar Marcas - ${editDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })}</h3>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="edit-section">
                    <h4>Marca de Entrada</h4>
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="marks-entry">Marcas Disponibles</button>
                        <button class="tab-btn" data-tab="manual-entry">Edición Manual</button>
                    </div>
                    <div class="tab-content active" id="marks-entry">
                        <div class="marks-list entry-marks"></div>
                    </div>
                    <div class="tab-content" id="manual-entry">
                        <div class="manual-input-container">
                            <input type="time" class="time-input entry-time" />
                        </div>
                    </div>
                </div>
                <div class="edit-section">
                    <h4>Marca de Salida</h4>
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="marks-exit">Marcas Disponibles</button>
                        <button class="tab-btn" data-tab="manual-exit">Edición Manual</button>
                    </div>
                    <div class="tab-content active" id="marks-exit">
                        <div class="marks-list exit-marks"></div>
                    </div>
                    <div class="tab-content" id="manual-exit">
                        <div class="manual-input-container">
                            <input type="time" class="time-input exit-time" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="save-btn">Guardar Cambios</button>
                <button class="cancel-btn">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Obtener referencias a los elementos
    const entryCell = row.querySelector('td:nth-child(2)');
    const exitCell = row.querySelector('td:nth-child(3)');
    const currentId = parseInt(document.getElementById('idInput').value);

    const originalEntryTime = new Date(entryCell.dataset.timestamp);
    const originalExitTime = new Date(exitCell.dataset.timestamp);

    let selectedEntryTime = originalEntryTime;
    let selectedExitTime = originalExitTime;

    // Obtener las marcas disponibles
    const marks = getAvailableMarks(editDate, currentId);
    console.log('Marcas disponibles:', marks); // Debug

    const entryMarksList = modal.querySelector('.entry-marks');
    const exitMarksList = modal.querySelector('.exit-marks');

    // Llenar las listas de marcas
    marks.forEach(mark => {
        const markDate = new Date(mark.timestamp);
        let timeLabel = '';
        let dayClass = '';
        
        if (markDate.getDate() < editDate.getDate()) {
            timeLabel = '<span class="day-indicator prev-day">Día anterior - ' + 
                       markDate.toLocaleDateString('es-ES', {
                           day: '2-digit',
                           month: '2-digit',
                           year: 'numeric'
                       }) + '</span>';
            dayClass = 'prev-day-item';
        } else if (markDate.getDate() > editDate.getDate()) {
            timeLabel = '<span class="day-indicator next-day">Día siguiente - ' + 
                       markDate.toLocaleDateString('es-ES', {
                           day: '2-digit',
                           month: '2-digit',
                           year: 'numeric'
                       }) + '</span>';
            dayClass = 'next-day-item';
        } else {
            timeLabel = '<span class="day-indicator current-day">' + 
                       markDate.toLocaleDateString('es-ES', {
                           day: '2-digit',
                           month: '2-digit',
                           year: 'numeric'
                       }) + '</span>';
            dayClass = 'current-day-item';
        }
        
        const markItem = document.createElement('div');
        markItem.className = `mark-item ${dayClass}`;
        markItem.innerHTML = `
            ${timeLabel}
            <span class="mark-time">
                <i class="fas fa-clock"></i>
                ${markDate.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false 
                })}
            </span>
        `;

        // Crear copias para entrada y salida
        const entryItem = markItem.cloneNode(true);
        const exitItem = markItem.cloneNode(true);

        if (markDate.getTime() === originalEntryTime.getTime()) {
            entryItem.classList.add('selected');
        }
        if (markDate.getTime() === originalExitTime.getTime()) {
            exitItem.classList.add('selected');
        }

        entryItem.addEventListener('click', () => {
            selectedEntryTime = new Date(mark.timestamp);
            entryMarksList.querySelectorAll('.mark-item').forEach(item => item.classList.remove('selected'));
            entryItem.classList.add('selected');
        });

        exitItem.addEventListener('click', () => {
            selectedExitTime = new Date(mark.timestamp);
            exitMarksList.querySelectorAll('.mark-item').forEach(item => item.classList.remove('selected'));
            exitItem.classList.add('selected');
        });

        entryMarksList.appendChild(entryItem);
        exitMarksList.appendChild(exitItem);
    });

    // Configurar inputs manuales
    const entryManualInput = modal.querySelector('.entry-time');
    const exitManualInput = modal.querySelector('.exit-time');

    entryManualInput.value = formatTimeForInput(originalEntryTime);
    exitManualInput.value = formatTimeForInput(originalExitTime);

    entryManualInput.addEventListener('change', (e) => {
        selectedEntryTime = inputTimeToDate(e.target.value, originalEntryTime);
    });

    exitManualInput.addEventListener('change', (e) => {
        selectedExitTime = inputTimeToDate(e.target.value, originalExitTime);
    });

    // Configurar las pestañas
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            const section = e.target.closest('.edit-section');
            
            section.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            section.querySelector(`#${tabId}`).classList.add('active');
        });
    });

    // Configurar botones
    modal.querySelector('.save-btn').addEventListener('click', () => {
        // Determinar si se usó edición manual para entrada y salida
        const entryTab = modal.querySelector('.edit-section:first-child .tab-btn.active');
        const exitTab = modal.querySelector('.edit-section:last-child .tab-btn.active');
        
        const isManualEntry = entryTab.dataset.tab === 'manual-entry';
        const isManualExit = exitTab.dataset.tab === 'manual-exit';

        // Establecer los atributos de datos
        entryCell.dataset.manual = isManualEntry;
        exitCell.dataset.manual = isManualExit;
        
        entryCell.dataset.timestamp = selectedEntryTime.toISOString();
        exitCell.dataset.timestamp = selectedExitTime.toISOString();
        
        entryCell.textContent = selectedEntryTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        exitCell.textContent = selectedExitTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        reprocessDay(row);
        document.body.removeChild(modal);
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Agregar estilos adicionales
    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
        .modal-content {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            max-width: 800px;
            width: 90%;
        }

        .modal-header {
            background-color: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            border-radius: 12px 12px 0 0;
            padding: 15px 20px;
        }

        .marks-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 12px;
            background-color: #ffffff;
        }

        .mark-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 6px 0;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #e9ecef;
            background-color: #ffffff;
            color: #333333;
        }

        .mark-item:hover {
            background-color: #f8f9fa;
            border-color: #dee2e6;
        }

        .mark-item.selected {
            background-color: #e7f3ff;
            border-color: #b3d7ff;
            color: #0066FF;
        }

        .prev-day-item {
            background-color: #fff8e6;
            border-color: #ffe8a1;
            color: #333333;
        }

        .next-day-item {
            background-color: #e7f5ea;
            border-color: #b7dfc1;
            color: #333333;
        }

        .current-day-item {
            background-color: #ffffff;
            border-color: #dee2e6;
            color: #333333;
        }

        .mark-time {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1em;
            font-weight: 500;
            color: #333333;
        }

        .mark-time i {
            color: #0066FF;
        }

        .day-indicator {
            font-size: 0.9em;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
            display: inline-block;
            margin-bottom: 4px;
        }

        .prev-day {
            background-color: #fff8e6;
            color: #856404;
        }

        .next-day {
            background-color: #e7f5ea;
            color: #155724;
        }

        .current-day {
            background-color: #e7f3ff;
            color: #0066FF;
        }

        .manual-input-container {
            padding: 25px;
            text-align: center;
            background-color: #f8f9fa;
            border-radius: 8px;
            margin: 10px 0;
        }

        .time-input {
            padding: 10px 15px;
            font-size: 1.2em;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            background-color: #ffffff;
            color: #333333;
        }

        .time-input:focus {
            border-color: #b3d7ff;
            box-shadow: 0 0 0 0.2rem rgba(0,102,255,0.25);
            outline: none;
        }

        .tab-btn {
            padding: 8px 16px;
            border: none;
            background: none;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #6c757d;
            font-weight: 500;
            transition: all 0.2s;
        }

        .tab-btn:hover {
            color: #0066FF;
        }

        .tab-btn.active {
            border-bottom-color: #0066FF;
            color: #0066FF;
        }

        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .save-btn, .cancel-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .save-btn {
            background-color: #0066FF;
            color: white;
        }

        .save-btn:hover {
            background-color: #0052cc;
        }

        .cancel-btn {
            background-color: #f8f9fa;
            color: #6c757d;
            border: 1px solid #dee2e6;
        }

        .cancel-btn:hover {
            background-color: #e9ecef;
        }

        .edit-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #ffffff;
            border-radius: 8px;
        }

        .edit-section h4 {
            color: #333333;
            margin-bottom: 15px;
        }

        .tabs {
            margin-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
    `;
    document.head.appendChild(additionalStyles);

    return modal;
}

// Función para habilitar la edición de una fila
function enableRowEdit(row) {
    const modal = createEditModal(row);
    document.body.appendChild(modal);
}

// Estilos CSS para la modal (agregar al final del archivo)
const styles = document.createElement('style');
styles.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        width: 80%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .modal-header h3 {
        margin: 0;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
    }

    .edit-section {
        margin-bottom: 20px;
    }

    .tabs {
        display: flex;
        margin-bottom: 10px;
    }

    .tab-btn {
        padding: 8px 16px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 2px solid transparent;
    }

    .tab-btn.active {
        border-bottom-color: #0066FF;
        color: #0066FF;
    }

    .tab-content {
        display: none;
        padding: 10px;
    }

    .tab-content.active {
        display: block;
    }

    .marks-list {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .mark-item {
        padding: 8px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        transition: background-color 0.2s;
    }

    .mark-item:hover {
        background-color: #f5f5f5;
    }

    .mark-item.selected {
        background-color: #e3f2fd;
        color: #0066FF;
    }

    .time-input {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1em;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    .save-btn, .cancel-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .save-btn {
        background-color: #0066FF;
        color: white;
    }

    .cancel-btn {
        background-color: #f5f5f5;
    }
`;

document.head.appendChild(styles);

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

function getAvailableMarks(date, currentId) {
    // Crear fechas para el día anterior, actual y siguiente
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log('Fecha actual:', date.toLocaleDateString());
    console.log('Día anterior:', prevDay.toLocaleDateString());
    console.log('Día siguiente:', nextDay.toLocaleDateString());

    // Filtrar las marcas disponibles
    return data.filter(item => {
        if (item.id !== currentId) return false;

        const markDate = new Date(item.timestamp);
        
        // Comparar las fechas usando getTime() para mayor precisión
        const markDateWithoutTime = new Date(markDate.getFullYear(), markDate.getMonth(), markDate.getDate());
        const prevDayWithoutTime = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate());
        const dateWithoutTime = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nextDayWithoutTime = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());

        return (
            markDateWithoutTime.getTime() === prevDayWithoutTime.getTime() ||
            markDateWithoutTime.getTime() === dateWithoutTime.getTime() ||
            markDateWithoutTime.getTime() === nextDayWithoutTime.getTime()
        );
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Función para reprocesar el día después de editar las marcas
function reprocessDay(row) {
    const entryCell = row.querySelector('td:nth-child(2)');
    const exitCell = row.querySelector('td:nth-child(3)');
    const diurnalCell = row.querySelector('td:nth-child(4)');
    const nocturnalCell = row.querySelector('td:nth-child(5)');
    const statusSelect = row.querySelector('select');
    const alertCell = row.querySelector('td:nth-child(7)');

    const entrada = new Date(entryCell.dataset.timestamp);
    const salida = new Date(exitCell.dataset.timestamp);

    // Obtener el estado anterior para actualizar los totales
    const previousStatus = statusSelect.getAttribute('data-previous-status');
    const previousDiurnal = diurnalCell.textContent;
    const previousNocturnal = nocturnalCell.textContent;

    // Restar las horas anteriores de los totales
    if (previousStatus) {
        actualizarTotales(totals, previousStatus, previousDiurnal, previousNocturnal, true);
    }

    // Calcular las nuevas horas extras
    const { diurnalSeconds, nocturnalSeconds, alertMessage } = calcularHorasExtras(entrada, salida);

    // Actualizar las celdas con los nuevos valores
    diurnalCell.textContent = formatTime(diurnalSeconds);
    nocturnalCell.textContent = formatTime(nocturnalSeconds);

    // Preparar las alertas
    let alerts = [];

    // Verificar si es una marca de madrugada
    const exitHour = salida.getHours();
    if (exitHour >= 0 && exitHour < 4) {
        alerts.push(`<div class="alert alert-info"><i class="fas fa-info-circle"></i><span>Se asignó automáticamente la marca de salida de la madrugada siguiente</span></div>`);
    }

    // Agregar el mensaje de horas extras si existe
    if (alertMessage) {
        alerts.push(alertMessage);
    }

    // Determinar el tipo de modificación basado en los atributos de datos
    const isManualEntry = entryCell.dataset.manual === 'true';
    const isManualExit = exitCell.dataset.manual === 'true';
    
    if (isManualEntry || isManualExit) {
        alerts.push(`<div class="alert alert-warning"><i class="fas fa-edit"></i><span>Se realizó una modificación manual de ${isManualEntry ? 'entrada' : ''}${isManualEntry && isManualExit ? ' y ' : ''}${isManualExit ? 'salida' : ''}</span></div>`);
    } else {
        alerts.push(`<div class="alert alert-info"><i class="fas fa-clock"></i><span>Se utilizaron marcas existentes para la modificación</span></div>`);
    }

    // Actualizar la celda de alertas con todos los mensajes
    alertCell.innerHTML = alerts.join('');

    // Actualizar los totales con las nuevas horas
    actualizarTotales(totals, statusSelect.value, formatTime(diurnalSeconds), formatTime(nocturnalSeconds));

    // Actualizar el resumen
    mostrarResumen();
}

document.addEventListener('DOMContentLoaded', function() {
    // Aplicar estilos mejorados a los elementos existentes
    applyEnhancedStyles();
    
    // Ejecutar cada vez que cambia el DOM significativamente
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                applyEnhancedStyles();
            }
        });
    });
    
    // Observar cambios en el cuerpo del documento
    observer.observe(document.body, { childList: true, subtree: true });
});

// Función para aplicar estilos mejorados a los elementos
function applyEnhancedStyles() {
    // Mejorar los selectores de estado
    const statusSelectors = document.querySelectorAll('select.status-select, select.AUTORIZADO, select[class*="AUTORIZADO"], select[value="AUTORIZADO"]');
    statusSelectors.forEach(selector => {
        // Aplicar estilos modernos y elegantes
        selector.style.background = 'linear-gradient(135deg, #4361ee, #4d6aff)';
        selector.style.color = 'white';
        selector.style.border = 'none';
        selector.style.borderRadius = '50px';
        selector.style.padding = '0.5rem 2rem 0.5rem 1rem';
        selector.style.minWidth = '120px';
        selector.style.fontWeight = '600';
        selector.style.boxShadow = '0 3px 10px rgba(0, 123, 255, 0.15)';
        selector.style.appearance = 'none';
        selector.style.webkitAppearance = 'none';
        selector.style.MozAppearance = 'none';
        selector.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")';
        selector.style.backgroundRepeat = 'no-repeat';
        selector.style.backgroundPosition = 'right 12px center';
        selector.style.backgroundSize = '12px';
        
        // Aplicar color según el valor seleccionado
        updateSelectStyle(selector);
        
        // Actualizar estilos cuando cambie la selección
        if (!selector.hasEnhancedEventListener) {
            selector.addEventListener('change', function() {
                updateSelectStyle(this);
            });
            selector.hasEnhancedEventListener = true;
        }
    });
    
    // Mejorar los botones de edición
    const editButtons = document.querySelectorAll('.action-btn, .edit-btn, button[class*="edit"]');
    editButtons.forEach(button => {
        // Aplicar estilos elegantes
        button.style.background = 'linear-gradient(135deg, #4361ee, #4d6aff)';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.width = '36px';
        button.style.height = '36px';
        button.style.borderRadius = '50%';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.boxShadow = '0 3px 10px rgba(0, 123, 255, 0.15)';
        button.style.transition = 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)';
        button.style.margin = '0 auto';
        button.style.padding = '0';
        button.style.position = 'relative';
        button.style.zIndex = '1';
        button.style.textAlign = 'center';
        
        // Si el botón tiene un ícono, asegurarse de que se vea bien
        const icon = button.querySelector('i');
        if (icon) {
            icon.style.fontSize = '1rem';
            icon.style.display = 'inline-block';
            icon.style.margin = '0';
            icon.style.padding = '0';
        } else if (button.classList.contains('edit-btn') && !button.innerHTML.includes('<i')) {
            // Si es un botón de editar pero no tiene ícono, agregar uno
            const oldText = button.innerHTML;
            if (oldText === 'Editar') {
                button.innerHTML = '<i class="fas fa-edit"></i>';
            }
        }
        
        // Eventos para efectos hover
        if (!button.hasEnhancedEventListener) {
            button.addEventListener('mouseenter', function() {
                this.style.background = 'linear-gradient(135deg, #4d6aff, #4361ee)';
                this.style.transform = 'translateY(-3px) scale(1.05)';
                this.style.boxShadow = '0 5px 15px rgba(0, 123, 255, 0.25)';
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.background = 'linear-gradient(135deg, #4361ee, #4d6aff)';
                this.style.transform = '';
                this.style.boxShadow = '0 3px 10px rgba(0, 123, 255, 0.15)';
            });
            
            button.hasEnhancedEventListener = true;
        }
    });
    
    // Mejorar observaciones
    const observaciones = document.querySelectorAll('.observacion-text, td > span:not([class])');
    observaciones.forEach(obs => {
        const text = obs.textContent;
        if (text && text.includes('flexibilidad horaria')) {
            obs.style.color = '#333';
            obs.style.display = 'flex';
            obs.style.alignItems = 'center';
            obs.style.padding = '6px 10px';
            obs.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
            obs.style.borderRadius = '8px';
            obs.style.borderLeft = '3px solid #4361ee';
            
            // Si no tiene ícono, agregar uno
            if (!obs.querySelector('i')) {
                const icon = document.createElement('i');
                icon.className = 'fas fa-info-circle';
                icon.style.color = '#4361ee';
                icon.style.marginRight = '10px';
                obs.prepend(icon);
            }
        }
    });
}

// Función auxiliar para actualizar el estilo de un selector según su valor
function updateSelectStyle(selector) {
    if (selector.value === 'AUTORIZADO') {
        selector.style.background = 'linear-gradient(135deg, #4361ee, #4d6aff)';
        selector.style.color = 'white';
    } else if (selector.value === 'PENDIENTE') {
        selector.style.background = 'linear-gradient(135deg, #f9c74f, #ffdb70)';
        selector.style.color = '#333';
    } else if (selector.value === 'RECHAZADO') {
        selector.style.background = 'linear-gradient(135deg, #f94144, #ff6b70)';
        selector.style.color = 'white';
    }
}






