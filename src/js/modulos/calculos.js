import { getData, getRegistroHoras, actualizarRegistroHoras, feriados } from './datos.js';
import { esFeriado } from './utilidades.js';

export let totalDiurnasSeconds = 0;
export let totalNocturnasSeconds = 0;

export const totals = {
    aprobadas: { "25%": 0, "50%": 0 },
    rechazadas: { "25%": 0, "50%": 0 },
    pendientes: { "25%": 0, "50%": 0 }
};

// Ajustar las horas de inicio y fin
const HORA_INICIO_NORMAL = 8 * 3600 + 33 * 60; // 8:33 en segundos
const HORA_FIN_NORMAL = 17 * 3600 + 33 * 60; // 17:33 en segundos
const HORA_INICIO_NOCTURNA = 22 * 3600; // 22:00 en segundos
const HORA_FIN_NOCTURNA = 6 * 3600; // 6:00 en segundos

export function resetTotals() {
    totalDiurnasSeconds = 0;
    totalNocturnasSeconds = 0;
    Object.keys(totals).forEach(categoria => {
        Object.keys(totals[categoria]).forEach(porcentaje => {
            totals[categoria][porcentaje] = 0;
        });
    });
}

// Función para convertir una fecha a segundos desde medianoche
function getSegundosDelDia(fecha) {
    return fecha.getHours() * 3600 + fecha.getMinutes() * 60 + fecha.getSeconds();
}

// Función para calcular horas extras entre dos timestamps
function calcularHorasExtras(entrada, salida) {
    const segundosEntrada = getSegundosDelDia(entrada);
    const segundosSalida = getSegundosDelDia(salida);
    
    let horasDiurnas = 0;
    let horasNocturnas = 0;
    
    // Si la salida es después de la hora normal de fin, calcular horas extras
    if (segundosSalida > HORA_FIN_NORMAL) {
        const tiempoExtra = segundosSalida - HORA_FIN_NORMAL;
        
        // Determinar si las horas extras son diurnas o nocturnas
        if (segundosSalida >= HORA_INICIO_NOCTURNA || segundosSalida <= HORA_FIN_NOCTURNA) {
            horasNocturnas = tiempoExtra;
        } else {
            horasDiurnas = tiempoExtra;
        }
    }
    
    return { horasDiurnas, horasNocturnas };
}

export function calcularHoras(id, mes, año) {
    const data = getData();
    
    console.log('Iniciando cálculo de horas para:', { id, mes, año });
    console.log('Total de registros disponibles:', data.length);
    
    // Limpiar solo el registro de horas y los totales
    resetTotals();
    const registroHoras = getRegistroHoras();
    Object.keys(registroHoras).forEach(key => delete registroHoras[key]);
    
    const registrosFiltrados = data.filter(registro => {
        const coincide = registro.id === id &&
               registro.timestamp.getMonth() === mes &&
               registro.timestamp.getFullYear() === año;
        return coincide;
    });

    console.log('Registros encontrados para el filtro:', registrosFiltrados.length);

    if (registrosFiltrados.length === 0) {
        console.log('No se encontraron registros para los criterios especificados');
        return;
    }

    // Agrupar registros por fecha
    const registrosPorFecha = {};
    registrosFiltrados.forEach(registro => {
        const fechaFormateada = registro.timestamp.toLocaleDateString('es-ES');
        if (!registrosPorFecha[fechaFormateada]) {
            registrosPorFecha[fechaFormateada] = [];
        }
        registrosPorFecha[fechaFormateada].push(registro);
    });

    // Procesar cada día
    Object.entries(registrosPorFecha).forEach(([fecha, registrosDia]) => {
        // Ordenar registros del día por hora
        registrosDia.sort((a, b) => a.timestamp - b.timestamp);
        
        // Encontrar la primera entrada y última salida del día
        const entrada = registrosDia[0].timestamp;
        const salida = registrosDia[registrosDia.length - 1].timestamp;
        
        // Calcular horas extras
        const { horasDiurnas, horasNocturnas } = calcularHorasExtras(entrada, salida);
        
        // Siempre registrar las horas del día
        actualizarRegistroHoras(fecha, {
            entrada,
            salida,
            diurnas: horasDiurnas,
            nocturnas: horasNocturnas,
            esFeriado: esFeriado(entrada),
            estado: "aprobadas" // Por defecto, todas las horas extras se marcan como aprobadas
        });
        
        if (horasDiurnas > 0 || horasNocturnas > 0) {
            // Actualizar totales
            totalDiurnasSeconds += horasDiurnas;
            totalNocturnasSeconds += horasNocturnas;
            
            // Actualizar totales por tipo
            if (horasDiurnas > 0) totals.aprobadas["25%"]++;
            if (horasNocturnas > 0) totals.aprobadas["50%"]++;
        }
    });

    console.log('Cálculo finalizado:', {
        totalDiurnas: Math.floor(totalDiurnasSeconds / 3600),
        totalNocturnas: Math.floor(totalNocturnasSeconds / 3600),
        registrosPorDia: Object.keys(getRegistroHoras()).length
    });
} 