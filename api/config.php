<?php
// api/config.php
// Konfigurasi koneksi database

// Sesuaikan detail koneksi database Anda di sini
define('DB_SERVER', 'localhost'); // Biasanya 'localhost'
define('DB_USERNAME', 'root');     // Nama pengguna database Anda
define('DB_PASSWORD', '');         // Kata sandi database Anda
define('DB_NAME', 'suskom');  // Nama database yang Anda buat (misalnya, 'restoran_db')

// Membuat koneksi database
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Memeriksa koneksi
if ($conn->connect_error) {
    die("Koneksi database gagal: " . $conn->connect_error);
}

// Mengatur header untuk JSON Response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Izinkan akses dari semua domain (untuk pengembangan)
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
