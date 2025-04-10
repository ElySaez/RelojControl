// Función para cargar datos de empleados de ejemplo
function cargarDatosEmpleadosEjemplo() {
    const empleadosBase = [
        {
            "RUT": "18.505.719-3",
            "NOMBRE": "Carlos",
            "APELLIDOS": "Martínez Soto",
            "DEPARTAMENTO": "Recursos Humanos"
        },
        {
            "RUT": "19.452.863-1",
            "NOMBRE": "Ana",
            "APELLIDOS": "González Pérez",
            "DEPARTAMENTO": "Contabilidad"
        },
        {
            "RUT": "20.154.782-K",
            "NOMBRE": "Roberto",
            "APELLIDOS": "Sánchez Vega",
            "DEPARTAMENTO": "Tecnología"
        },
        {
            "RUT": "21.547.896-5",
            "NOMBRE": "María",
            "APELLIDOS": "Fernández López",
            "DEPARTAMENTO": "Operaciones"
        },
        {
            "RUT": "9.848.204-0",
            "NOMBRE": "WALDO PATRICIO",
            "APELLIDOS": "YEVENES CORONADO",
            "DEPARTAMENTO": "Seguridad"
        }
    ];
    
    // Añadir campos adicionales necesarios para la aplicación
    return empleadosBase.map(emp => {
        // Crear copia y añadir campos necesarios
        const empleado = {...emp};
        
        // Guardar RUT original
        empleado.RUT_ORIGINAL = emp.RUT;
        
        // Limpiar el RUT (quitar puntos, guión y dígito verificador)
        if (empleado.RUT) {
            empleado.RUT_LIMPIO = empleado.RUT.replace(/\./g, '').replace(/-\w$/i, '');
        }
        
        console.log(`Empleado de ejemplo: ${empleado.NOMBRE} ${empleado.APELLIDOS}, RUT: ${empleado.RUT}, RUT_LIMPIO: ${empleado.RUT_LIMPIO}`);
        return empleado;
    });
}

// Esta es una función que puede usar para limpiar RUTs en un array de empleados
function limpiarRutsEmpleados(empleados) {
    return empleados.map(emp => {
        // Crear una copia para no modificar el original
        const empleado = {...emp};
        
        // Guardar el RUT original
        empleado.RUT_ORIGINAL = emp.RUT;
        
        // Limpiar el RUT (quitar puntos, guión y dígito verificador)
        if (empleado.RUT) {
            empleado.RUT_LIMPIO = empleado.RUT.replace(/\./g, '').replace(/-\w$/i, '');
        }
        
        return empleado;
    });
}

// Ejemplo de uso:
// const empleadosLimpios = limpiarRutsEmpleados(datosEmpleados);
// console.log(empleadosLimpios); 