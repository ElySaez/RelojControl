# Sistema de Control de Horas Extras

## 📋 Descripción
Sistema web para el control y gestión de horas extras de empleados. Permite registrar, visualizar y generar reportes de horas extras, con funcionalidades específicas para diferentes tipos de horarios laborales.

## ✨ Características Principales

### 🔐 Sistema de Autenticación
- Login seguro con roles de usuario (Admin/Supervisor)
- Protección de rutas y datos según rol
- Gestión de sesiones

### 📊 Gestión de Horas Extras
- Registro de entradas y salidas
- Cálculo automático de horas extras
- Diferenciación entre horas extras diurnas (25%) y nocturnas (50%)
- Estados de aprobación (Autorizado, Pendiente, Rechazado)

### 📈 Reportes
- Generación de reportes por empleado
- Filtros por mes y año
- Exportación a PDF y Excel con formato profesional
- Resumen detallado de horas extras por tipo
- Reportes especiales para horarios nocturnos

### 🎨 Interfaz de Usuario
- Diseño responsivo y moderno
- Iconografía intuitiva
- Tablas interactivas
- Alertas y notificaciones informativas

## 🛠️ Tecnologías Utilizadas

### Frontend
- HTML5
- CSS3 (con variables CSS para temas)
- JavaScript (Vanilla)
- Font Awesome 5.15.4 (iconos)

### Librerías
- ExcelJS 4.3.0 (generación de Excel)
- jsPDF 2.5.1 (generación de PDF)
- jsPDF-AutoTable 3.5.13 (tablas en PDF)

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/ElySaez/RelojControl
```

2. Navega al directorio del proyecto:
```bash
cd Reloj-1
```

3. Abre el archivo `index.html` en tu navegador o utiliza un servidor web local.

## 🚀 Uso

### Acceso al Sistema
1. Ingresa con tus credenciales en la página de login
2. El sistema validará tu rol y te redirigirá al dashboard correspondiente

### Generación de Reportes
1. Ingresa el ID del empleado
2. Selecciona mes y año
3. Haz clic en "Generar Reporte"
4. Utiliza los botones de exportación para descargar en PDF o Excel

### Reportes Especiales
1. Accede a la sección de reportes especiales
2. Ideal para personal con horario nocturno (6:30 PM a 3:30 AM)
3. Sigue el mismo proceso de generación de reportes

## 👥 Roles de Usuario

### Administrador
- Acceso completo al sistema
- Gestión de usuarios
- Aprobación/Rechazo de horas extras
- Generación de todos los reportes

### Supervisor
- Visualización de reportes
- Aprobación de horas extras
- Acceso limitado a funciones administrativas

## ⚙️ Configuración

### Personalización de Estilos
Los estilos se pueden modificar en `src/css/styles.css`

### Variables de Entorno
Configurables en los archivos JavaScript correspondientes:
- Horarios laborales
- Porcentajes de horas extras
- Rangos de fechas permitidos

## 🤝 Contribución
Las contribuciones son bienvenidas. Para cambios importantes:

1. Haz fork del repositorio
2. Crea una nueva rama
3. Realiza tus cambios
4. Envía un pull request

## 📄 Licencia
Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## 📞 Soporte
Para soporte o preguntas, por favor crea un issue en el repositorio.

## ✨ Agradecimientos
- A todos los contribuidores que han participado en este proyecto
- A la comunidad de desarrolladores por sus valiosos recursos y librerías
