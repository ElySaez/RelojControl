// Verificar si hay una sesión activa, si no, redirigir al login
if (!sessionStorage.getItem('currentUser')) {
    window.location.href = '../index.html';
} else {
    // Mostrar información del usuario
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    document.getElementById('currentUserDisplay').innerHTML = `
        <i class="fas fa-user"></i> ${currentUser.username} (${currentUser.role})
    `;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

function redirectToSpecial() {
    window.location.href = "hoemhe.html";
}

function redirectToIndex() {
    window.location.href = '/index.html';
}

function filterData() {
    // Lógica para filtrar los datos y mostrar el reporte
    // ...

    // Mostrar los botones de descarga después de filtrar
    document.getElementById('downloadPdfBtn').style.display = 'block';
    document.getElementById('downloadExcelBtn').style.display = 'block';
} 