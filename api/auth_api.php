<?php
// api/auth_api.php
// Menangani login pelanggan dan karyawan

require_once 'config.php'; // Sertakan file konfigurasi database

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? '';

$response = ['success' => false, 'message' => 'Permintaan tidak valid.'];

switch ($action) {
    case 'customer_login':
        $tableCode = $conn->real_escape_string($data['tableCode'] ?? '');
        $customerName = $conn->real_escape_string($data['customerName'] ?? '');

        if (empty($tableCode) || empty($customerName)) {
            $response = ['success' => false, 'message' => 'Kode Meja dan Nama Anda harus diisi.'];
            break;
        }

        // Periksa apakah kode meja ada
        $stmt = $conn->prepare("SELECT id, table_code, status FROM tables WHERE table_code = ?");
        $stmt->bind_param("s", $tableCode);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $table = $result->fetch_assoc();
            // Perbarui status meja menjadi 'ordering'
            $updateTableStmt = $conn->prepare("UPDATE tables SET status = 'ordering', customer_name = ? WHERE id = ?");
            $updateTableStmt->bind_param("si", $customerName, $table['id']);
            $updateTableStmt->execute();
            $updateTableStmt->close();

            $response = [
                'success' => true,
                'message' => 'Login pelanggan berhasil!',
                'table' => ['table_code' => $table['table_code']]
            ];
        } else {
            $response = ['success' => false, 'message' => 'Kode Meja tidak ditemukan.'];
        }
        $stmt->close();
        break;

    case 'employee_login':
        $username = $conn->real_escape_string($data['username'] ?? '');
        $password = $conn->real_escape_string($data['password'] ?? '');

        if (empty($username) || empty($password)) {
            $response = ['success' => false, 'message' => 'Nama Pengguna dan Kata Sandi harus diisi.'];
            break;
        }

        $stmt = $conn->prepare("SELECT id, username, password, name, role, email FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            // --- KEAMANAN PENTING: Gunakan password_verify() untuk memverifikasi password hash.
            // if (password_verify($password, $user['password'])) {
            
            // Untuk demo, kita kembali ke perbandingan plaintext seperti kode asli.
            // JANGAN LAKUKAN INI DI APLIKASI NYATA!
            if ($password === $user['password']) {
                $response = [
                    'success' => true,
                    'message' => 'Login karyawan berhasil!',
                    'employee' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'name' => $user['name'],
                        'role' => $user['role'],
                        'email' => $user['email']
                    ]
                ];
            } else {
                $response = ['success' => false, 'message' => 'Kata Sandi salah.'];
            }
        } else {
            $response = ['success' => false, 'message' => 'Nama Pengguna tidak ditemukan.'];
        }
        $stmt->close();
        break;

    default:
        // Pesan default sudah diatur di awal
        break;
}

echo json_encode($response);

// Pastikan skrip berhenti di sini untuk mencegah output tambahan
exit();
?>
