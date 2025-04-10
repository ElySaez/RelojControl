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
    fetch('Data.dat')
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
    // Horario normal de trabajo: 18:30 PM a 3:30 AM del día siguiente
    const startOfNormalDay = new Date(startTime);
    startOfNormalDay.setHours(18, 30, 0, 0);

    const endOfNormalDay = new Date(startOfNormalDay);
    endOfNormalDay.setDate(endOfNormalDay.getDate() + 1); // Al día siguiente
    endOfNormalDay.setHours(3, 30, 0, 0);

    const isWeekend = startTime.getDay() === 0 || startTime.getDay() === 6; // Domingo o sábado
    const isHoliday = esFeriado(startTime); // Verificar si es feriado

    let extraDiurnalSeconds = 0; // Horas extras diurnas (25%)
    let extraNocturnalSeconds = 0; // Horas extras nocturnas/feriado (50%)

    // Caso: es fin de semana o feriado
    if (isWeekend || isHoliday) {
        extraNocturnalSeconds = (endTime - startTime) / 1000; // Todo el rango cuenta como extra nocturna
    } else {
        // Caso: día laboral normal
        if (startTime < startOfNormalDay) {
            // Antes del inicio del horario normal
            extraDiurnalSeconds += Math.min((startOfNormalDay - startTime) / 1000, (endTime - startTime) / 1000);
        }

        if (endTime > endOfNormalDay) {
            // Después del fin del horario normal
            extraNocturnalSeconds += (endTime - Math.max(endOfNormalDay, startTime)) / 1000;
        }
    }

    // Excluir horas normales que no cuentan como extras
    const normalWorkSeconds = Math.max(0, Math.min(endTime, endOfNormalDay) - Math.max(startTime, startOfNormalDay)) / 1000;

    // Total horas extras diurnas y nocturnas
    const totalExtras = {
        diurnalSeconds: Math.round(extraDiurnalSeconds),
        nocturnalSeconds: Math.round(extraNocturnalSeconds),
        normalWorkSeconds: Math.round(normalWorkSeconds),
    };

    return totalExtras;
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
    // Convertir los totales de segundos a formato hh:mm:ss
    const totalDiurnasFormatted = formatTime(totalDiurnasSeconds);
    const totalNocturnasFormatted = formatTime(totalNocturnasSeconds);
    const totalCombinedSeconds = totalDiurnasSeconds + totalNocturnasSeconds;
    const totalCombinedFormatted = formatTime(totalCombinedSeconds);

    // Mostrar los totales en el contenedor correspondiente
    document.getElementById('resumen-container').innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <h3>Total H.E. Aprobadas</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>${totalDiurnasFormatted}</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>${totalNocturnasFormatted}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-4">
                <h3>Total H.E. Rechazadas</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>00:00:00</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>00:00:00</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-4">
                <h3>Total H.E. Pendientes</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td>Total H. E. Diurnas al 25%:</td><td>00:00:00</td></tr>
                        <tr><td>Total H. E. Nocturnas al 50%:</td><td>00:00:00</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <h3>Suma Total de Horas Extras</h3>
                <table class="table table-bordered">
                    <tbody>
                        <tr><td><strong>Suma Total Horas Extras Aprobadas Diurnas + Nocturnas:</strong></td><td><strong>${totalCombinedFormatted}</strong></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    console.log("Totales calculados:");
    console.log("Horas extras diurnas:", totalDiurnasFormatted);
    console.log("Horas extras nocturnas:", totalNocturnasFormatted);
    console.log("Total combinado:", totalCombinedFormatted);
}
function redirectToIndex() {
    window.location.href = "index.html"; // Redirigir al archivo index.html
}
function generateReport(filteredData) {
    totalDiurnasSeconds = 0;
    totalNocturnasSeconds = 0;

    let dailyData = {};

    filteredData.forEach(item => {
        const timestamp = new Date(item.timestamp);

        // Agrupamos registros por fecha clave
        let dateKey = timestamp.toLocaleDateString();
        if (timestamp.getHours() < 6) {
            // Si es antes de las 6:00 AM, pertenece al turno del día anterior
            const previousDate = new Date(timestamp);
            previousDate.setDate(previousDate.getDate() - 1);
            dateKey = previousDate.toLocaleDateString();
        }

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                id: item.id,
                date: dateKey,
                startTime: timestamp,
                endTime: timestamp,
                autoAssigned: false,
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

        // Calcular horas extras reales
        const { diurnalSeconds, nocturnalSeconds, normalWorkSeconds } = calcularHorasExtras(record.startTime, record.endTime);

        const diurnalFormatted = formatTime(diurnalSeconds);
        const nocturnalFormatted = formatTime(nocturnalSeconds);

        totalDiurnasSeconds += diurnalSeconds;
        totalNocturnasSeconds += nocturnalSeconds;

        tableContent += `
            <tr>
                <td>${record.date}</td>
                <td>${startTimeFormatted}</td>
                <td>${endTimeFormatted}</td>
                <td>${diurnalFormatted}</td>
                <td>${nocturnalFormatted}</td>
                <td>
                    <select class="status-select" onchange="updateTotal(this, '${record.date}', '${diurnalFormatted}', '${nocturnalFormatted}')">
                        <option value="AUTORIZADO" selected>AUTORIZADO</option>
                        <option value="RECHAZADO">RECHAZADO</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                    </select>
                </td>
                <td>${normalWorkSeconds > 0 ? '' : '<span class="alert-text" style="color:red;">Falta marca-Revisar manualmente</span>'}</td>
            </tr>
        `;
    }

    document.getElementById('output').innerHTML = `
        <h2>Reporte de Horas Extras</h2>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Hora Inicio</th>
                    <th>Hora Fin</th>
                    <th>Horas Extras Diurnas (25%)</th>
                    <th>Horas Extras Nocturnas/Feriado (50%)</th>
                    <th>Estado</th>
                    <th>Alerta</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent}
            </tbody>
        </table>
    `;

    mostrarResumen();
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
    if (seconds < 0) return "00:00:00"; // Evitar valores negativos

    const hours = Math.floor(seconds / 3600); // Horas
    const minutes = Math.floor((seconds % 3600) / 60); // Minutos
    const secs = seconds % 60; // Segundos restantes

    return [hours, minutes, secs]
        .map(unit => String(unit).padStart(2, '0')) // Asegurar dos dígitos
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
function actualizarTotales(totals, status, horasExtrasDiurnas, horasExtrasNocturnas, restar = false) {
    // Convertimos las horas extras en segundos
    const diurnasPartes = horasExtrasDiurnas.split(':').map(Number);
    const nocturnasPartes = horasExtrasNocturnas.split(':').map(Number);

    const segundosDiurnas = diurnasPartes[0] * 3600 + diurnasPartes[1] * 60 + diurnasPartes[2];
    const segundosNocturnas = nocturnasPartes[0] * 3600 + nocturnasPartes[1] * 60 + nocturnasPartes[2];

    // Aplicamos un factor de suma o resta, dependiendo del parámetro 'restar'
    const factor = restar ? -1 : 1;

    // Según el estado, actualizamos los totales
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

    console.log("Totales actualizados:", totals);
}
function reinicializarTotales() {
    totals = {
        aprobadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        rechazadas: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 },
        pendientes: { "0%": 0, "25%": 0, "50%": 0, "100%": 0 }
    };
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

    // Obtener el ID ingresado por el usuario
    const reportID = document.getElementById('idInput').value || 'Desconocido';

    // Añadir título al documento
    const title = `Horas Extras - ID: ${reportID}`;
    doc.setFontSize(18);
    doc.text(title, 15, 10); // Posicionamos el título en el PDF

    // Obtener el contenido de la tabla
    const table = document.querySelector('#output table');
    const rows = table.querySelectorAll('tr');

    const data = [];

    rows.forEach((row, rowIndex) => {
        const rowData = [];
        const cells = row.querySelectorAll('td, th');

        cells.forEach((cell, cellIndex) => {
            if (cellIndex === 5 && rowIndex > 0) { // Columna "Estado"
                const selectElement = cell.querySelector('select');
                rowData.push(selectElement ? selectElement.value : cell.textContent);
            } else {
                rowData.push(cell.textContent);
            }
        });

        data.push(rowData);
    });

    // Añadir la tabla al PDF usando autoTable
    doc.autoTable({
        head: [data[0]],  // La primera fila es el encabezado
        body: data.slice(1),  // Las siguientes filas son los datos
        theme: 'grid',
        headStyles: { fillColor: [0, 123, 255] }, // Color del encabezado de la tabla
        startY: 20,  // Empezar después del título
        margin: { top: 10 }  // Márgenes en la tabla
    });

    // Guardar el archivo con un nombre dinámico basado en el ID
    const fileName = `reporte_horas_extras_ID_${reportID}.pdf`;
    doc.save(fileName);
}
function downloadExcel() {
    // Crear una nueva hoja de cálculo (workbook) y hoja (worksheet)
    const wb = XLSX.utils.book_new();
    const ws_data = [];

    // Añadir encabezado de la tabla
    const table = document.querySelector('#output table');
    const headers = Array.from(table.querySelectorAll('thead tr th')).map(th => th.textContent);
    ws_data.push(headers);

    // Obtener el contenido de la tabla sin duplicar el encabezado
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        
        // Agregar las celdas de la fila al array
        cells.forEach((cell, cellIndex) => {
            // Verificar si es una celda de tiempo (diurno o nocturno)
            if (cellIndex === 3 || cellIndex === 4) {
                const timeText = cell.textContent.trim();
                
                // Si el texto de la hora tiene formato hh:mm:ss, lo mantenemos como está
                if (timeText.match(/^\d{2}:\d{2}:\d{2}$/)) {
                    rowData.push(timeText); // Guardar directamente como texto "hh:mm:ss"
                } else {
                    rowData.push("00:00:00"); // Si no es un formato de hora válido, dejar como 00:00:00
                }
            } else {
                rowData.push(cell.textContent); // Para todas las demás celdas
            }
        });

        ws_data.push(rowData);
    });

    // Añadir los totales al final de la hoja
    let totalDiurnasFormatted = formatTime(totalDiurnasSeconds);
    let totalNocturnasFormatted = formatTime(totalNocturnasSeconds);
    let totalCombinedFormatted = formatTime(totalDiurnasSeconds + totalNocturnasSeconds);

    // Mover los totales una columna atrás para alinearlos correctamente
    ws_data.push(['', '', 'Total:', totalDiurnasFormatted, totalNocturnasFormatted]);
    ws_data.push(['', '', 'Total Combinado:', totalCombinedFormatted]);

    // Crear la hoja de cálculo a partir de los datos
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Horas Extras");

    // Descargar el archivo Excel
    const reportID = document.getElementById('idInput').value || 'Desconocido';
    const fileName = `reporte_horas_extras_ID_${reportID}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Permite editar un registro en la tabla
 * @param {string} fecha - Fecha del registro a editar
 */
function editRecord(fecha) {
    console.log("editRecord: Editando registro de fecha:", fecha);
    
    // Buscar la fila correspondiente a la fecha
    const fila = document.querySelector(`tr[data-fecha="${fecha}"]`);
    if (!fila) {
        console.error("No se encontró la fila para la fecha:", fecha);
        return;
    }
    
    // Obtener los valores actuales
    const celdas = fila.querySelectorAll('td');
    const entrada = celdas[1].textContent.trim();
    const salida = celdas[2].textContent.trim();
    
    // Obtener el estado actual
    const estadoSelect = fila.querySelector('select');
    const estadoActual = estadoSelect ? estadoSelect.value : 'AUTORIZADO';
    
    // Crear formulario de edición
    const formEdicion = `
        <div class="edicion-form">
            <div class="form-group">
                <label>Entrada:</label>
                <input type="text" class="form-control entrada-edit" value="${entrada}" placeholder="HH:MM">
            </div>
            <div class="form-group">
                <label>Salida:</label>
                <input type="text" class="form-control salida-edit" value="${salida}" placeholder="HH:MM">
            </div>
            <div class="form-buttons">
                <button class="btn btn-sm btn-success guardar-btn" onclick="saveEdit(this, '${fecha}', '${entrada}', '${salida}', '${estadoActual}')">
                    <i class="fas fa-save"></i> Guardar
                </button>
                <button class="btn btn-sm btn-danger cancelar-btn" onclick="cancelEdit(this)">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    
    // Guardar estado anterior
    celdas[1].setAttribute('data-original', entrada);
    celdas[2].setAttribute('data-original', salida);
    
    // Mostrar formulario de edición
    celdas[1].innerHTML = formEdicion;
    
    // Ocultar las demás celdas temporalmente
    celdas[2].style.display = 'none';
    celdas[3].style.display = 'none';
    celdas[4].style.display = 'none';
    celdas[5].style.display = 'none';
    celdas[6].style.display = 'none';
    
    // Cambiar el colspan para que ocupe toda la fila
    celdas[1].setAttribute('colspan', '6');
    
    // Destacar la fila que se está editando
    fila.classList.add('fila-editando');
}

/**
 * Guarda los cambios de un registro editado
 * @param {HTMLElement} btn - Botón que se hizo clic
 * @param {string} fecha - Fecha del registro
 * @param {string} entradaOriginal - Valor original de entrada
 * @param {string} salidaOriginal - Valor original de salida
 * @param {string} estadoOriginal - Estado original
 */
function saveEdit(btn, fecha, entradaOriginal, salidaOriginal, estadoOriginal) {
    const fila = btn.closest('tr');
    const celdas = fila.querySelectorAll('td');
    
    // Obtener los nuevos valores
    const entradaInput = fila.querySelector('.entrada-edit');
    const salidaInput = fila.querySelector('.salida-edit');
    
    const nuevaEntrada = entradaInput ? entradaInput.value.trim() : entradaOriginal;
    const nuevaSalida = salidaInput ? salidaInput.value.trim() : salidaOriginal;
    
    // Validar formato de hora (HH:MM)
    const regexHora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regexHora.test(nuevaEntrada) || !regexHora.test(nuevaSalida)) {
        alert("Formato de hora inválido. Debe ser HH:MM");
        return;
    }
    
    try {
        // Calcular horas extras
        const empleadoID = document.getElementById('idInput').value;
        const idLimpio = empleadoID.replace(/\./g, '').replace(/-\w$/i, '');
        const idsHorarioNocturno = ["11988936", "9848204", "7442608", "11872224"];
        const esHorarioNocturno = idsHorarioNocturno.includes(idLimpio);
        
        const resultado = calcularHorasExtras(nuevaEntrada, nuevaSalida, esHorarioNocturno);
        
        // Formatear horas extras
        const horasExtras = resultado.horasExtras;
        const minutos = resultado.minutos;
        const horasFormateadas = `${String(horasExtras).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;
        
        // Restablecer las celdas
        celdas[1].innerHTML = nuevaEntrada;
        celdas[1].removeAttribute('colspan');
        
        celdas[2].style.display = '';
        celdas[2].textContent = nuevaSalida;
        
        celdas[3].style.display = '';
        celdas[4].style.display = '';
        celdas[5].style.display = '';
        celdas[6].style.display = '';
        
        // Verificar si es día no laboral
        const esFeriado = fecha && (esFeriado(new Date(fecha)) || 
                        new Date(fecha).getDay() === 0 || 
                        new Date(fecha).getDay() === 6);
        
        // Actualizar horas extras en la tabla
        if (esFeriado) {
            celdas[3].textContent = '00:00:00';
            celdas[4].textContent = horasFormateadas;
        } else {
            celdas[3].textContent = horasFormateadas;
            celdas[4].textContent = '00:00:00';
        }
        
        // Quitar clase de edición
        fila.classList.remove('fila-editando');
        
        // Recalcular totales si es necesario
        recalcularTotales();
        
    } catch (error) {
        console.error("Error al guardar edición:", error);
        alert("Error al guardar los cambios: " + error.message);
        
        // Restaurar valores originales
        cancelEdit(btn);
    }
}

/**
 * Cancela la edición de un registro
 * @param {HTMLElement} btn - Botón que se hizo clic
 */
function cancelEdit(btn) {
    const fila = btn.closest('tr');
    const celdas = fila.querySelectorAll('td');
    
    // Restaurar valor original
    const entradaOriginal = celdas[1].getAttribute('data-original');
    celdas[1].textContent = entradaOriginal;
    celdas[1].removeAttribute('colspan');
    
    // Mostrar todas las celdas nuevamente
    celdas[2].style.display = '';
    celdas[3].style.display = '';
    celdas[4].style.display = '';
    celdas[5].style.display = '';
    celdas[6].style.display = '';
    
    // Quitar clase de edición
    fila.classList.remove('fila-editando');
}





