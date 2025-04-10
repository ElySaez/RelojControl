from cryptography.fernet import Fernet
import json
import os
import base64

def encrypt_file(file_path, key):
    if not os.path.exists(file_path):
        print(f"Archivo no encontrado: {file_path}")
        return
    
    f = Fernet(key)
    
    # Leer el archivo original
    with open(file_path, 'rb') as file:
        file_data = file.read()
    
    # Encriptar los datos
    encrypted_data = f.encrypt(file_data)
    
    # Guardar el archivo encriptado
    encrypted_file_path = file_path + '.enc'
    with open(encrypted_file_path, 'wb') as file:
        file.write(encrypted_data)
    
    print(f"Archivo encriptado guardado como: {encrypted_file_path}")

def main():
    # Generar una nueva clave
    key = Fernet.generate_key()
    
    # Guardar la clave en un archivo
    with open('encryption_key.key', 'wb') as key_file:
        key_file.write(key)
    
    # Lista de archivos a encriptar
    files_to_encrypt = [
        'src/js/info_backup.json',
        'src/js/info.json',
        'src/js/data.json',
        'src/js/Data.dat'
    ]
    
    # Encriptar cada archivo
    for file_path in files_to_encrypt:
        encrypt_file(file_path, key)
    
    print("\nClave de encriptación guardada en 'encryption_key.key'")
    print("¡IMPORTANTE! Guarda esta clave en un lugar seguro y no la subas a GitHub")
    
    # Crear archivo .gitignore si no existe
    gitignore_content = """
# Archivos originales con datos sensibles
src/js/info_backup.json
src/js/info.json
src/js/data.json
src/js/Data.dat

# Clave de encriptación
encryption_key.key
"""
    
    with open('.gitignore', 'a') as gitignore:
        gitignore.write(gitignore_content)

if __name__ == "__main__":
    main() 