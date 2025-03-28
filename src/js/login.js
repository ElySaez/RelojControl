// Usuarios permitidos (en un sistema real, esto estaría en el backend)
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'supervisor', password: 'super123', role: 'supervisor' }
];

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const alertElement = document.getElementById('loginAlert');
    const alertMessage = document.getElementById('alertMessage');
    
    // Buscar el usuario
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // Guardar la información de la sesión
        sessionStorage.setItem('currentUser', JSON.stringify({
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString()
        }));
        
        // Redirigir al dashboard
        window.location.href = 'src/dashboard.html';
    } else {
        // Mostrar error
        alertElement.classList.add('show');
        alertMessage.textContent = 'Usuario o contraseña incorrectos';
        
        // Limpiar el formulario
        document.getElementById('password').value = '';
        
        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
            alertElement.classList.remove('show');
        }, 3000);
    }
    
    return false;
} 