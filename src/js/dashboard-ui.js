// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeDashboard();

    // Configurar evento para el botón de carga de estadísticas
    const btnCargarEstadisticas = document.getElementById('cargar-estadisticas');
    if (btnCargarEstadisticas) {
        btnCargarEstadisticas.addEventListener('click', function() {
            const mesSeleccionado = document.getElementById('mes-estadisticas')?.value || new Date().getMonth() + 1;
            const anioSeleccionado = document.getElementById('anio-estadisticas')?.value || new Date().getFullYear();
            cargarEstadisticasReales(mesSeleccionado, anioSeleccionado);
        });
    }

    // Establecer mes y año actuales por defecto
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1; // getMonth() devuelve 0-11
    const anioActual = fechaActual.getFullYear();
    
    const selectorMes = document.getElementById('mes-estadisticas');
    const selectorAnio = document.getElementById('anio-estadisticas');
    
    if (selectorMes) selectorMes.value = mesActual;
    if (selectorAnio) {
        // Verificar si el año actual existe como opción, de lo contrario crear una
        let existeAnio = false;
        for (let i = 0; i < selectorAnio.options.length; i++) {
            if (parseInt(selectorAnio.options[i].value) === anioActual) {
                existeAnio = true;
                break;
            }
        }
        
        if (!existeAnio) {
            const nuevaOpcion = document.createElement('option');
            nuevaOpcion.value = anioActual;
            nuevaOpcion.textContent = anioActual;
            selectorAnio.appendChild(nuevaOpcion);
        }
        
        selectorAnio.value = anioActual;
    }
});

// Verificar si hay una sesión activa, si no, redirigir al login
function checkAuthentication() {
    if (!sessionStorage.getItem('currentUser')) {
        window.location.href = '../index.html';
    } else {
        // Mostrar información del usuario
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const userDisplay = document.getElementById('currentUserDisplay');
        if (userDisplay) {
            userDisplay.innerHTML = `
                <i class="fas fa-user"></i> ${currentUser.username} (${currentUser.role})
            `;
        }
    }
}

// Cerrar sesión
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

// Redirigir a reportes especiales
function redirectToSpecial() {
    window.location.href = "hoemhe.html";
}

// Función para cambiar entre pestañas
function changeTab(tabId, element) {
    // Destruir gráficos existentes para evitar errores de reuso de canvas
    if (window.chartHorasExtras) {
        window.chartHorasExtras.destroy();
        window.chartHorasExtras = null;
    }
    if (window.chartAtrasos) {
        window.chartAtrasos.destroy();
        window.chartAtrasos = null;
    }
    if (window.chartComparativo) {
        window.chartComparativo.destroy();
        window.chartComparativo = null;
    }
    
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
    }
    
    // Mostrar la pestaña seleccionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');
    
    // Actualizar la clase active en los botones de pestaña
    const tabButtons = document.querySelectorAll('.tab');
    if (tabButtons && tabButtons.length > 0) {
        tabButtons.forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
    }
    
    // Activar el botón de la pestaña actual
    if (element) {
        element.classList.add('active');
    } else {
        const tabButton = document.querySelector(`.tab[onclick*="${tabId}"]`);
        if (tabButton) tabButton.classList.add('active');
    }
    
    // Si estamos en el dashboard, cargar las estadísticas
    if (tabId === 'home') {
        // Usar setTimeout para asegurar que el DOM esté listo
        setTimeout(() => {
            loadDashboardData();
        }, 100);
    }
}

// Cargar datos del dashboard
function loadDashboardData() {
    // Simulación de datos para las estadísticas
    // En un caso real, estos datos vendrían de tu API o base de datos
    
    // Animar incremento de valores
    animateValue('totalHorasExtras', 0, 42.5, 2000, 'h');
    animateValue('totalAtrasos', 0, 3, 1500);
    animateValue('porcentajeCumplimiento', 0, 95, 2000, '%');
    
    // Generar las gráficas con datos de ejemplo
    // Asegurar que los gráficos anteriores sean destruidos
    if (typeof generateCharts === 'function') {
        setTimeout(() => {
            generateCharts();
        }, 100);
    }
}

// Función para animar incremento de valores
function animateValue(id, start, end, duration, suffix = '') {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let value = progress * (end - start) + start;
        
        // Formatear el valor según el tipo
        if (suffix === 'h') {
            obj.innerHTML = value.toFixed(1) + suffix;
        } else if (suffix === '%') {
            obj.innerHTML = Math.floor(value) + suffix;
        } else {
            obj.innerHTML = Math.floor(value);
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Variables globales para datos
let datosCompletos = [];
let datosEmpleados = [];
let empleadosInfoCargados = false;

function initializeDashboard() {
    // Inicializar con datos de ejemplo
    generarDatosDePrueba();

    // Inicializar pestañas
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remover clase activa de todas las pestañas
            tabs.forEach(t => t.classList.remove("active"));
            // Añadir clase activa a la pestaña actual
            tab.classList.add("active");
            
            // Ocultar todos los contenidos
            tabContents.forEach(content => content.classList.remove("active"));
            
            // Mostrar el contenido correspondiente
            const targetId = tab.getAttribute("data-tab");
            document.getElementById(targetId).classList.add("active");
        });
    });

    // Cargar datos reales si están disponibles
    cargarDatosCompletos();
    
    // Cargar datos de empleados desde info.json
    cargarDatosEmpleados();
    
    // Configurar el evento de generación de reportes
    const generarReporteBtn = document.getElementById('generar-reporte-btn');
    if (generarReporteBtn) {
        generarReporteBtn.addEventListener('click', function() {
            console.log("Botón de generación de reporte pulsado");
            // Verificar si los datos de empleados ya se cargaron
            if (datosEmpleados.length === 0 && !empleadosInfoCargados) {
                console.log("Cargando datos de empleados de emergencia antes de generar reporte");
                cargarDatosEmpleadosEjemplo();
            }
            filterData();
        });
    }
}

// Función para cargar todos los datos del archivo Data.dat
function cargarDatosCompletos() {
    fetch('Data.dat')
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el archivo Data.dat');
            }
            return response.text();
        })
        .then(content => {
            datosCompletos = parseDataContent(content);
            console.log('Datos cargados correctamente:', datosCompletos.length, 'registros');
            
            // Cargar estadísticas del mes y año actuales
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            cargarEstadisticasReales(mesActual, anioActual);
        })
        .catch(error => {
            console.error('Error al cargar el archivo:', error);
            // Si hay error, mantener los datos de prueba
        });
}

// Función para analizar el contenido del archivo Data.dat
function parseDataContent(content) {
    const lines = content.split('\n');
    return lines.map(line => {
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

// Función para cargar datos de empleados desde info.json
function cargarDatosEmpleados() {
    fetch('/src/js/data/info.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el archivo info.json');
            }
            return response.json();
        })
        .then(data => {
            // Limpiar los RUTs antes de almacenarlos
            datosEmpleados = data.map(emp => {
                // Crear una copia para no modificar el original
                const empleado = {...emp};
                
                // También guardar el RUT original para mostrarlo formateado
                empleado.RUT_ORIGINAL = emp.RUT;
                
                // Limpiar el RUT (quitar puntos, guión y dígito verificador)
                if (empleado.RUT) {
                    empleado.RUT_LIMPIO = empleado.RUT.replace(/\./g, '').replace(/-\w$/i, '');
                }
                
                return empleado;
            });
            
            console.log('Datos de empleados cargados y limpiados:', datosEmpleados.length);
            empleadosInfoCargados = true;
        })
        .catch(error => {
            console.error('Error al cargar el archivo de empleados:', error);
            // Usar datos de ejemplo como fallback
            cargarDatosEmpleadosEjemplo();
        });
}

// Cargar datos de empleados de ejemplo en caso de error
function cargarDatosEmpleadosEjemplo() {
    datosEmpleados = [
        {
            "RUT": "18.505.719-3",
            "NOMBRE": "Carlos",
            "APELLIDOS": "Martínez Soto"
        },
        {
            "RUT": "19.452.863-1",
            "NOMBRE": "Ana",
            "APELLIDOS": "González Pérez"
        },
        {
            "RUT": "20.154.782-K",
            "NOMBRE": "Roberto",
            "APELLIDOS": "Sánchez Vega"
        },
        {
            "RUT": "21.547.896-5",
            "NOMBRE": "María",
            "APELLIDOS": "Fernández López"
        },
        {
            "RUT": "9.848.204-0",
            "NOMBRE": "WALDO PATRICIO",
            "APELLIDOS": "YEVENES CORONADO"
        }
    ];
    console.log('Usando datos de empleados de ejemplo');
}

// Función para crear encabezados con ID
function createIdHeader(idValue) {
    // Limpiar el ID de entrada (quitar puntos, guión y dígito verificador)
    const idLimpio = idValue ? idValue.replace(/\./g, '').replace(/-\w$/i, '') : '';
    
    console.log("Buscando empleado con RUT:", idValue);
    console.log("ID limpio:", idLimpio);
    
    // Buscar el empleado por RUT limpio
    const empleado = datosEmpleados.find(emp => {
        return (emp.RUT_LIMPIO === idLimpio) || 
               (emp.RUT === idValue) || 
               (emp.RUT.replace(/\./g, '').replace(/-/, '') === idValue.replace(/\./g, '').replace(/-/, ''));
    });
    
    if (empleado) {
        console.log("Empleado encontrado:", empleado.NOMBRE, empleado.APELLIDOS);
    } else {
        console.log("Empleado no encontrado con RUT:", idValue);
        console.log("Empleados disponibles:", datosEmpleados.length);
    }
    
    // Si no se encuentra, usar valores por defecto
    const nombre = empleado ? empleado.NOMBRE : "No encontrado";
    const apellidos = empleado ? empleado.APELLIDOS : "";
    const rutFormateado = empleado ? (empleado.RUT_ORIGINAL || empleado.RUT) : idValue;
    const departamento = empleado ? empleado.DEPARTAMENTO : "";
    
    return `
        <div class="id-header">
            <div class="employee-info">
                <div class="employee-id">
                    <i class="fas fa-id-card"></i>
                    <span>RUT: <span class="id-value">${rutFormateado}</span></span>
                </div>
                <div class="employee-name">
                    <i class="fas fa-user"></i>
                    <div class="name-container">
                        <div class="employee-firstname text-dark font-weight-bold">${nombre}</div>
                        <div class="employee-lastname text-dark font-weight-bold">${apellidos}</div>
                    </div>
                </div>
            </div>
            <div class="employee-dept">
                ${departamento ? `<i class="fas fa-building"></i> <span class="text-dark">${departamento}</span>` : ""}
            </div>
        </div>
    `;
}

// Función para filtrar datos y generar reportes
function filterData() {
    const idValue = document.getElementById('idInput').value;
    const monthValue = document.getElementById('monthInput').value;
    const yearValue = document.getElementById('yearInput').value;
    
    if (!idValue || !monthValue || !yearValue) {
        alert("Por favor complete todos los campos");
        return;
    }
    
    console.log("filterData: Iniciando filtrado con ID:", idValue);
    console.log("filterData: Datos de empleados disponibles:", datosEmpleados.length);
    
    // Si no hay datos de empleados, intentar cargarlos y usar datos de ejemplo como fallback
    if (datosEmpleados.length === 0) {
        console.warn("No hay datos de empleados cargados. Usando datos de ejemplo.");
        cargarDatosEmpleadosEjemplo();
        // Intentar cargar nuevamente en segundo plano
        cargarDatosEmpleados();
    }
    
    // Obtener info del empleado
    const idLimpio = idValue ? idValue.replace(/\./g, '').replace(/-\w$/i, '') : '';
    const empleado = datosEmpleados.find(emp => {
        if (!emp || !emp.RUT) {
            console.warn("Empleado sin RUT encontrado en los datos");
            return false;
        }
        
        const coincide = (emp.RUT_LIMPIO === idLimpio) || 
               (emp.RUT === idValue) || 
               (emp.RUT.replace(/\./g, '').replace(/-/, '') === idValue.replace(/\./g, '').replace(/-/, ''));
        
        if (coincide) {
            console.log("filterData: Empleado encontrado:", emp.NOMBRE, emp.APELLIDOS);
        }
        
        return coincide;
    });
    
    console.log("filterData: Resultado de búsqueda:", empleado ? "Encontrado" : "No encontrado");
    
    const nombre = empleado ? empleado.NOMBRE : "No encontrado";
    const apellidos = empleado ? empleado.APELLIDOS : "";
    const rutFormateado = empleado ? (empleado.RUT_ORIGINAL || empleado.RUT) : idValue;
    const departamento = empleado ? empleado.DEPARTAMENTO : "";
    
    // Crear HTML para la cabecera y período
    const idHeader = createIdHeader(idValue);
    const periodoInfo = `<p class="text-muted">Período: ${monthValue}/${yearValue}</p>`;
    
    // Simulación de datos para ejemplo (reemplazar con datos reales)
    const datos = [
        {
            fecha: "03/03/2025",
            entrada: "08:20:31",
            salida: "20:14:03",
            heDiurnas: "02:53:32",
            heNocturnas: "00:00:00",
            estado: "AUTORIZADO",
            observaciones: "Se aplicó flexibilidad horaria. Hora de salida esperada: 17:20"
        },
        {
            fecha: "04/03/2025",
            entrada: "08:20:53",
            salida: "17:33:08",
            heDiurnas: "00:12:15",
            heNocturnas: "00:00:00",
            estado: "AUTORIZADO",
            observaciones: "Se aplicó flexibilidad horaria. Hora de salida esperada: 17:20"
        },
        {
            fecha: "05/03/2025",
            entrada: "08:25:15",
            salida: "20:15:10",
            heDiurnas: "02:49:55",
            heNocturnas: "00:00:00",
            estado: "AUTORIZADO",
            observaciones: "Se aplicó flexibilidad horaria. Hora de salida esperada: 17:25"
        },
        {
            fecha: "06/03/2025",
            entrada: "08:24:56",
            salida: "17:36:21",
            heDiurnas: "00:11:25",
            heNocturnas: "00:00:00",
            estado: "RECHAZADO",
            observaciones: "Se aplicó flexibilidad horaria. Hora de salida esperada: 17:24"
        }
    ];
    
    // Crear tabla con los datos
    let tableHTML = `
        <h3>Reporte de Horas Extras</h3>
        ${idHeader}
        ${periodoInfo}
        
        <!-- Información adicional del empleado -->
        <div class="empleado-info mb-4">
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <p><strong>RUT:</strong> <span class="text-dark font-weight-bold">${rutFormateado}</span></p>
                        </div>
                        <div class="col-md-4">
                            <p><strong>Nombre:</strong> <span class="text-dark font-weight-bold">${nombre}</span></p>
                        </div>
                        <div class="col-md-4">
                            <p><strong>Apellidos:</strong> <span class="text-dark font-weight-bold">${apellidos}</span></p>
                        </div>
                    </div>
                    ${departamento ? `
                    <div class="row">
                        <div class="col-md-12">
                            <p><strong>Departamento:</strong> <span class="text-dark">${departamento}</span></p>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        </div>
        
        <table class="reporte-tabla">
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
            <tbody>`;
    
    datos.forEach((item, index) => {
        // Determinar la clase de estado según el valor
        let estadoClass = "";
        if (item.estado === "AUTORIZADO") estadoClass = "estado-autorizado";
        else if (item.estado === "PENDIENTE") estadoClass = "estado-pendiente";
        else if (item.estado === "RECHAZADO") estadoClass = "estado-rechazado";
        
        tableHTML += `
            <tr>
                <td>${item.fecha}</td>
                <td>${item.entrada}</td>
                <td>${item.salida}</td>
                <td>${item.heDiurnas}</td>
                <td>${item.heNocturnas}</td>
                <td>
                    <select class="estado-selector ${estadoClass}">
                        <option value="AUTORIZADO" ${item.estado === "AUTORIZADO" ? "selected" : ""}>AUTORIZADO</option>
                        <option value="PENDIENTE" ${item.estado === "PENDIENTE" ? "selected" : ""}>PENDIENTE</option>
                        <option value="RECHAZADO" ${item.estado === "RECHAZADO" ? "selected" : ""}>RECHAZADO</option>
                    </select>
                </td>
                <td><span class="observacion-text"><i class="fas fa-info-circle"></i>${item.observaciones}</span></td>
                <td>
                    <button class="action-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>`;
    });
    
    tableHTML += `
            </tbody>
        </table>`;
    
    // Mostrar la tabla en el documento
    document.getElementById('output').innerHTML = tableHTML;
    
    // Mostrar botones de descarga
    document.getElementById('downloadPdfBtn').style.display = 'inline-flex';
    document.getElementById('downloadExcelBtn').style.display = 'inline-flex';
    
    // Agregar evento de cambio a los selectores de estado para actualizar su clase
    document.querySelectorAll('.estado-selector').forEach(selector => {
        selector.addEventListener('change', function() {
            // Quitar todas las clases de estado
            this.classList.remove('estado-autorizado', 'estado-pendiente', 'estado-rechazado');
            
            // Agregar la clase correspondiente al valor seleccionado
            if (this.value === 'AUTORIZADO') this.classList.add('estado-autorizado');
            else if (this.value === 'PENDIENTE') this.classList.add('estado-pendiente');
            else if (this.value === 'RECHAZADO') this.classList.add('estado-rechazado');
        });
    });
}

// Descargar reporte en PDF
function downloadPDF() {
    // Implementación para descargar PDF
    alert('Descargando PDF...');
}

// Descargar reporte en Excel
function downloadExcel() {
    // Implementación para descargar Excel
    alert('Descargando Excel...');
}

// Función para cargar estadísticas reales según el mes y año seleccionados
function cargarEstadisticasReales(mes, anio) {
    if (datosCompletos.length === 0) {
        console.warn("No hay datos disponibles para mostrar estadísticas.");
        return;
    }

    mes = parseInt(mes);
    anio = parseInt(anio);
    
    // Filtrar datos por mes y año seleccionados
    const datosFiltrados = datosCompletos.filter(item => {
        const fecha = new Date(item.timestamp);
        return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio;
    });
    
    if (datosFiltrados.length === 0) {
        console.warn(`No hay datos para el mes de ${getNombreMes(mes)} de ${anio}`);
        // Mostrar gráficos vacíos o con datos de ejemplo
        generarDatosDePrueba();
        return;
    }
    
    console.log(`Procesando ${datosFiltrados.length} registros para ${getNombreMes(mes)} de ${anio}`);
    
    // Procesar los datos para generar estadísticas
    procesarEstadisticas(datosFiltrados, mes, anio);
}

function getNombreMes(mes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1];
}

// Función para procesar los datos y generar estadísticas
function procesarEstadisticas(datos, mes, anio) {
    // Agrupar datos por empleado
    const empleadosMap = new Map();
    
    datos.forEach(item => {
        if (!empleadosMap.has(item.id)) {
            empleadosMap.set(item.id, []);
        }
        empleadosMap.get(item.id).push(item);
    });
    
    // Procesar cada empleado para obtener estadísticas
    let totalEmpleados = empleadosMap.size;
    let totalHorasExtras = 0;
    let totalAtrasos = 0;
    let asistenciasPorDia = {};
    let horasExtrasPorSemana = [0, 0, 0, 0, 0]; // Para 5 semanas máximo
    
    // Inicializar contadores por día
    for (let dia = 1; dia <= 31; dia++) {
        asistenciasPorDia[dia] = 0;
    }
    
    empleadosMap.forEach((registros, empleadoId) => {
        // Ordenar registros por fecha
        registros.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Agrupar por día
        const diasMap = new Map();
        registros.forEach(registro => {
            const fecha = new Date(registro.timestamp);
            const diaKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
            
            if (!diasMap.has(diaKey)) {
                diasMap.set(diaKey, []);
            }
            diasMap.get(diaKey).push(registro);
        });
        
        // Analizar cada día para el empleado
        diasMap.forEach((registrosDia, diaKey) => {
            const [anioStr, mesStr, diaStr] = diaKey.split('-');
            const dia = parseInt(diaStr);
            
            // Incrementar contador de asistencia por día
            asistenciasPorDia[dia]++;
            
            // Si hay al menos 2 registros (entrada y salida)
            if (registrosDia.length >= 2) {
                // Ordenar por timestamp
                registrosDia.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                // Primer registro del día (entrada)
                const entrada = new Date(registrosDia[0].timestamp);
                
                // Último registro del día (salida)
                const salida = new Date(registrosDia[registrosDia.length - 1].timestamp);
                
                // Calcular horas extras (si salida > 17:30 o entrada < 8:30)
                const horaEntradaNormal = new Date(entrada);
                horaEntradaNormal.setHours(8, 30, 0);
                
                const horaSalidaNormal = new Date(salida);
                horaSalidaNormal.setHours(17, 30, 0);
                
                // Si llegó tarde (después de las 8:30)
                if (entrada > horaEntradaNormal) {
                    totalAtrasos++;
                }
                
                // Si salió después del horario normal
                if (salida > horaSalidaNormal) {
                    const diferenciaMs = salida - horaSalidaNormal;
                    const horasExtras = diferenciaMs / (1000 * 60 * 60);
                    
                    if (horasExtras > 0) {
                        totalHorasExtras += horasExtras;
                        
                        // Añadir a la semana correspondiente
                        const semana = Math.floor((dia - 1) / 7);
                        if (semana >= 0 && semana < 5) {
                            horasExtrasPorSemana[semana] += horasExtras;
                        }
                    }
                }
            }
        });
    });
    
    // Actualizar estadísticas en el dashboard
    actualizarDashboardConEstadisticasReales(
        totalEmpleados,
        totalHorasExtras,
        totalAtrasos,
        asistenciasPorDia,
        horasExtrasPorSemana,
        mes,
        anio
    );
}

// Función para actualizar el dashboard con estadísticas reales
function actualizarDashboardConEstadisticasReales(
    totalEmpleados,
    totalHorasExtras,
    totalAtrasos,
    asistenciasPorDia,
    horasExtrasPorSemana,
    mes,
    anio
) {
    // Actualizar título del dashboard con el mes y año seleccionados
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = 
            `<i class="fas fa-chart-line"></i> Estadísticas de ${getNombreMes(mes)} ${anio}`;
    }
    
    // Actualizar tarjetas de estadísticas
    const elTotalHoras = document.getElementById('totalHorasExtras');
    const elTotalAtrasos = document.getElementById('totalAtrasos');
    const elPorcentaje = document.getElementById('porcentajeCumplimiento');
    
    if (elTotalHoras) elTotalHoras.textContent = totalHorasExtras.toFixed(1) + ' horas';
    if (elTotalAtrasos) elTotalAtrasos.textContent = totalAtrasos + ' días';
    
    // Calcular porcentaje de cumplimiento (ejemplo: basado en atrasos)
    let diasLaborables = 22; // Estimación estándar
    let porcentajeCumplimiento = 100 - ((totalAtrasos / (totalEmpleados * diasLaborables)) * 100);
    porcentajeCumplimiento = Math.max(0, Math.min(100, porcentajeCumplimiento));
    
    if (elPorcentaje) elPorcentaje.textContent = porcentajeCumplimiento.toFixed(1) + '%';
    
    // Actualizar gráficos
    actualizarGraficoHorasExtras(horasExtrasPorSemana, mes, anio);
    actualizarGraficoAtrasosPorDia(asistenciasPorDia, mes, anio);
    actualizarGraficoComparativoMensual(mes, anio, totalHorasExtras, totalAtrasos);
}

// Función para actualizar el gráfico de horas extras por semana
function actualizarGraficoHorasExtras(horasExtrasPorSemana, mes, anio) {
    const canvas = document.getElementById('horasExtrasChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'horasExtrasChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartHorasExtras) {
        window.chartHorasExtras.destroy();
        window.chartHorasExtras = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'horasExtrasChart'");
        return;
    }
    
    // Determinar el número de semanas en el mes
    const numSemanas = horasExtrasPorSemana.filter(h => h > 0).length || 
                      horasExtrasPorSemana.length;
    
    const labels = Array.from({length: numSemanas}, (_, i) => `Semana ${i+1}`);
    
    window.chartHorasExtras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Horas Extras',
                data: horasExtrasPorSemana.slice(0, numSemanas),
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Horas Extras por Semana - ${getNombreMes(mes)} ${anio}`
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Horas'
                    }
                }
            }
        }
    });
}

// Función para actualizar el gráfico de distribución de atrasos por día
function actualizarGraficoAtrasosPorDia(asistenciasPorDia, mes, anio) {
    const canvas = document.getElementById('atrasosChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'atrasosChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartAtrasos) {
        window.chartAtrasos.destroy();
        window.chartAtrasos = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'atrasosChart'");
        return;
    }
    
    // Preparar datos para el gráfico
    const diasDelMes = new Date(anio, mes, 0).getDate();
    const labels = Array.from({length: diasDelMes}, (_, i) => i + 1);
    const datos = labels.map(dia => asistenciasPorDia[dia] || 0);
    
    window.chartAtrasos = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Asistencias',
                data: datos,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Asistencias por Día - ${getNombreMes(mes)} ${anio}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Día del Mes'
                    }
                }
            }
        }
    });
}

// Función para actualizar el gráfico comparativo mensual
function actualizarGraficoComparativoMensual(mesActual, anioActual, horasExtras, atrasos) {
    const canvas = document.getElementById('comparativaChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'comparativaChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartComparativo) {
        window.chartComparativo.destroy();
        window.chartComparativo = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'comparativaChart'");
        return;
    }
    
    // Generar datos para el mes actual y simular meses anteriores
    const mesesAnteriores = 5; // Mostrar 6 meses en total (actual + 5 anteriores)
    const labels = [];
    const datosHorasExtras = [];
    const datosAtrasos = [];
    
    for (let i = mesesAnteriores; i >= 0; i--) {
        let mesIndex = mesActual - i;
        let anioIndex = anioActual;
        
        if (mesIndex <= 0) {
            mesIndex += 12;
            anioIndex--;
        }
        
        labels.push(`${getNombreMes(mesIndex)} ${anioIndex}`);
        
        if (i === 0) {
            // Datos reales para el mes actual
            datosHorasExtras.push(horasExtras);
            datosAtrasos.push(atrasos);
        } else {
            // Datos simulados para meses anteriores (ligeramente menores que el actual)
            const factorSimulacion = 0.7 + (0.3 * Math.random());
            datosHorasExtras.push(horasExtras * factorSimulacion);
            datosAtrasos.push(Math.round(atrasos * factorSimulacion));
        }
    }
    
    window.chartComparativo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Horas Extras',
                    data: datosHorasExtras,
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Atrasos',
                    data: datosAtrasos,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparativo Mensual'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Horas Extras'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Atrasos'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Función para generar datos de prueba para el dashboard inicial
function generarDatosDePrueba() {
    // Simulación de datos para las tarjetas
    const totalHorasExtras = document.getElementById('totalHorasExtras');
    const totalAtrasos = document.getElementById('totalAtrasos');
    const porcentajeCumplimiento = document.getElementById('porcentajeCumplimiento');
    
    if (totalHorasExtras) animateValue('totalHorasExtras', 0, 120.5, 2000);
    if (totalAtrasos) animateValue('totalAtrasos', 0, 15, 2000);
    if (porcentajeCumplimiento) animateValue('porcentajeCumplimiento', 0, 92.8, 2000);

    // Gráficos de ejemplo
    setTimeout(() => {
        generarGraficoHorasExtra();
        generarGraficoDistribucionAtrasos();
        generarGraficoComparativoMensual();
    }, 100);
}

// Estas funciones generan gráficos de prueba
function generarGraficoHorasExtra() {
    const canvas = document.getElementById('horasExtrasChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'horasExtrasChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartHorasExtras) {
        window.chartHorasExtras.destroy();
        window.chartHorasExtras = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'horasExtrasChart'");
        return;
    }
    
    window.chartHorasExtras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'Horas Extras',
                data: [25, 32, 40, 23],
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generarGraficoDistribucionAtrasos() {
    const canvas = document.getElementById('atrasosChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'atrasosChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartAtrasos) {
        window.chartAtrasos.destroy();
        window.chartAtrasos = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'atrasosChart'");
        return;
    }
    
    window.chartAtrasos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
            datasets: [{
                label: 'Atrasos',
                data: [4, 3, 2, 3, 3],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });
}

function generarGraficoComparativoMensual() {
    const canvas = document.getElementById('comparativaChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'comparativaChart'");
        return;
    }
    
    // Destruir gráfico existente si lo hay
    if (window.chartComparativo) {
        window.chartComparativo.destroy();
        window.chartComparativo = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'comparativaChart'");
        return;
    }
    
    window.chartComparativo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
            datasets: [{
                label: 'Horas Extras',
                data: [80, 90, 75, 110, 95, 120],
                fill: false,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
} 