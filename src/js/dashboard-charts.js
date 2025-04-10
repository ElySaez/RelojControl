// Define colores para todas las gráficas
const chartColors = {
    primary: 'rgba(67, 97, 238, 0.7)',
    primaryBorder: 'rgba(67, 97, 238, 1)',
    accent: 'rgba(247, 37, 133, 0.7)',
    accentBorder: 'rgba(247, 37, 133, 1)',
    success: 'rgba(76, 201, 240, 0.7)',
    successBorder: 'rgba(76, 201, 240, 1)',
    warning: 'rgba(249, 199, 79, 0.7)',
    warningBorder: 'rgba(249, 199, 79, 1)',
    danger: 'rgba(249, 65, 68, 0.7)',
    dangerBorder: 'rgba(249, 65, 68, 1)'
};

// Variables globales para mantener referencia a los gráficos
let horasExtrasChart = null;
let atrasosChart = null;
let comparativaChart = null;

// Configuración global de Chart.js
function setupChartDefaults() {
    Chart.defaults.color = "#666";
    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
}

// Función para limpiar todos los gráficos existentes
function clearAllCharts() {
    // Destruir gráficos existentes para evitar errores
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
    
    // También limpiar las variables locales
    if (horasExtrasChart) {
        horasExtrasChart.destroy();
        horasExtrasChart = null;
    }
    if (atrasosChart) {
        atrasosChart.destroy();
        atrasosChart = null;
    }
    if (comparativaChart) {
        comparativaChart.destroy();
        comparativaChart = null;
    }
}

// Generar gráfica de horas extras por semana
function generateHorasExtrasChart() {
    const canvas = document.getElementById('horasExtrasChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'horasExtrasChart'");
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (horasExtrasChart) {
        horasExtrasChart.destroy();
        horasExtrasChart = null;
    }
    if (window.chartHorasExtras) {
        window.chartHorasExtras.destroy();
        window.chartHorasExtras = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'horasExtrasChart'");
        return null;
    }
    
    horasExtrasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'Horas extras',
                data: [8.5, 12, 10.5, 11.5],
                backgroundColor: chartColors.primary,
                borderColor: chartColors.primaryBorder,
                borderWidth: 1,
                borderRadius: 5,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.formattedValue + ' horas';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + 'h';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Horas',
                        color: '#666',
                        font: {
                            weight: 'normal'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Asignar a la variable global para que pueda ser referenciada desde fuera
    window.chartHorasExtras = horasExtrasChart;
    
    return horasExtrasChart;
}

// Generar gráfica de distribución de atrasos
function generateAtrasosChart() {
    const canvas = document.getElementById('atrasosChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'atrasosChart'");
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (atrasosChart) {
        atrasosChart.destroy();
        atrasosChart = null;
    }
    if (window.chartAtrasos) {
        window.chartAtrasos.destroy();
        window.chartAtrasos = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'atrasosChart'");
        return null;
    }
    
    atrasosChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
            datasets: [{
                data: [1, 0, 1, 0, 1],
                backgroundColor: [
                    chartColors.primary,
                    chartColors.accent,
                    chartColors.success,
                    chartColors.warning,
                    chartColors.danger
                ],
                borderColor: [
                    chartColors.primaryBorder,
                    chartColors.accentBorder,
                    chartColors.successBorder,
                    chartColors.warningBorder,
                    chartColors.dangerBorder
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const label = context.label || '';
                            return label + ': ' + value + (value === 1 ? ' atraso' : ' atrasos');
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 2000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Asignar a la variable global para que pueda ser referenciada desde fuera
    window.chartAtrasos = atrasosChart;
    
    return atrasosChart;
}

// Generar gráfica comparativa mensual
function generateComparativaChart() {
    const canvas = document.getElementById('comparativaChart');
    if (!canvas) {
        console.warn("No se encontró el elemento 'comparativaChart'");
        return null;
    }
    
    // Destruir gráfico existente si lo hay
    if (comparativaChart) {
        comparativaChart.destroy();
        comparativaChart = null;
    }
    if (window.chartComparativo) {
        window.chartComparativo.destroy();
        window.chartComparativo = null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("No se pudo obtener el contexto del canvas para 'comparativaChart'");
        return null;
    }
    
    comparativaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
            datasets: [{
                label: 'Horas extras',
                data: [35, 38, 40, 42, 40, 43],
                fill: {
                    target: 'origin',
                    above: 'rgba(67, 97, 238, 0.1)'
                },
                borderColor: chartColors.primaryBorder,
                tension: 0.3,
                pointBackgroundColor: chartColors.primaryBorder,
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            },
            {
                label: 'Atrasos',
                data: [5, 4, 3, 3, 2, 3],
                fill: {
                    target: 'origin',
                    above: 'rgba(247, 37, 133, 0.1)'
                },
                borderColor: chartColors.accentBorder,
                tension: 0.3,
                pointBackgroundColor: chartColors.accentBorder,
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Asignar a la variable global para que pueda ser referenciada desde fuera
    window.chartComparativo = comparativaChart;
    
    return comparativaChart;
}

// Función principal para generar todas las gráficas
function generateCharts() {
    setupChartDefaults();
    
    // Limpiar gráficos existentes primero
    clearAllCharts();
    
    // Crear nuevos gráficos
    setTimeout(() => {
        generateHorasExtrasChart();
        generateAtrasosChart();
        generateComparativaChart();
    }, 50);
} 