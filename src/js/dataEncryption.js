// Función para encriptar el contenido
function encryptData(data, key) {
    const textToChars = (text) => text.split('').map(c => c.charCodeAt(0));
    const byteHex = (n) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code) => textToChars(key).reduce((a,b) => a ^ b, code);

    return data.split('')
        .map(textToChars)
        .map(applySaltToChar)
        .map(byteHex)
        .join('');
}

// Función para desencriptar el contenido
function decryptData(encoded, key) {
    const textToChars = (text) => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code) => textToChars(key).reduce((a,b) => a ^ b, code);
    
    return encoded.match(/.{1,2}/g)
        .map(hex => parseInt(hex, 16))
        .map(applySaltToChar)
        .map(charCode => String.fromCharCode(charCode))
        .join('');
}

// Función para leer y encriptar el archivo Data.dat
async function encryptDataFile() {
    try {
        const response = await fetch('Data.dat');
        const data = await response.text();
        const encryptedData = encryptData(data, process.env.DATA_KEY || 'ekisde');
        
        // Guardar el archivo encriptado
        const blob = new Blob([encryptedData], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Data.dat';
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al encriptar el archivo:', error);
    }
}

// Función para leer y desencriptar el archivo Data.dat
async function decryptDataFile() {
    try {
        const response = await fetch('Data.dat');
        const encryptedData = await response.text();
        return decryptData(encryptedData, process.env.DATA_KEY || 'your-secret-key');
    } catch (error) {
        console.error('Error al desencriptar el archivo:', error);
        return null;
    }
}

// Función para cargar los datos de forma segura
async function loadSecureData() {
    const decryptedData = await decryptDataFile();
    if (decryptedData) {
        // Procesar los datos desencriptados
        return JSON.parse(decryptedData);
    }
    return null;
}