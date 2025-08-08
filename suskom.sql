-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 31, 2025 at 05:23 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `suskom`
--

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(50) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`id`, `name`, `description`, `price`, `category`, `image_url`, `stock`) VALUES
(1, 'Nasi Goreng Spesial', 'Nasi goreng dengan ayam, telur, dan kerupuk.', 35000.00, 'makanan_utama', NULL, 50),
(2, 'Mie Ayam Bakso', 'Mie ayam dengan bakso sapi dan pangsit.', 30000.00, 'makanan_utama', NULL, 40),
(3, 'Sate Ayam Madura', '10 tusuk sate ayam dengan bumbu kacang.', 45000.00, 'makanan_utama', NULL, 60),
(4, 'Kentang Goreng', 'Kentang goreng renyah dengan saus.', 18000.00, 'pembuka', NULL, 100),
(5, 'Salad Buah Segar', 'Campuran buah-buahan segar dengan saus yoghurt.', 25000.00, 'pembuka', NULL, 28),
(6, 'Es Teh Manis', 'Teh hitam dingin dengan gula.', 10000.00, 'minuman', NULL, 156),
(7, 'Jus Jeruk', 'Jus jeruk segar tanpa pengawet.', 15000.00, 'minuman', NULL, 79),
(8, 'Puding Cokelat', 'Puding cokelat lembut dengan saus vanila.', 22000.00, 'dessert', NULL, 23),
(9, 'Brownies Ice Cream', 'Brownies hangat dengan satu scoop es krim vanila.', 28000.00, 'dessert', NULL, 34);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

-- Hapus tabel lama jika ada
DROP TABLE IF EXISTS `orders`;

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `order_time` datetime DEFAULT current_timestamp(),
  `total_amount` decimal(10,2) NOT NULL,
  -- Perbaikan: Menambahkan 'delivered' dan 'ordering' ke dalam ENUM
  `status` enum('pending','preparing','ready_for_delivery','delivered','completed','cancelled','paid','ordering') NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--
-- Catatan: Data pesanan lama dihapus karena perubahan struktur ENUM.
-- Anda perlu memasukkan data pesanan baru setelah menjalankan skrip ini.

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_order` decimal(10,2) NOT NULL,
  `item_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_id`, `menu_item_id`, `quantity`, `price_at_order`, `item_name`) VALUES
(6, 5, 2, 25000.00, 'Salad Buah Segar'),
(7, 7, 2, 15000.00, 'Jus Jeruk');

-- --------------------------------------------------------

--
-- Table structure for table `tables`
--

CREATE TABLE `tables` (
  `id` int(11) NOT NULL,
  `table_code` varchar(10) NOT NULL,
  `capacity` int(11) NOT NULL,
  `status` enum('available','occupied','reserved','ordering') NOT NULL DEFAULT 'available',
  `customer_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tables`
--

INSERT INTO `tables` (`id`, `table_code`, `capacity`, `status`, `customer_name`) VALUES
(1, 'T01', 4, 'available', NULL),
(2, 'T02', 2, 'available', NULL),
(3, 'T03', 6, 'available', 'NULL'),
(4, 'T04', 4, 'available', NULL),
(5, 'T05', 2, 'available', NULL),
(6, 'T06', 8, 'available', NULL),
(7, 'T07', 4, 'available', NULL),
(8, 'T08', 3, 'available', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` enum('admin','cashier','chef','waiter') NOT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `email`) VALUES
(1, 'admin', 'password', 'Admin Utama', 'admin', 'admin@restoran.com'),
(2, 'kasir1', 'password', 'Budi Kasir', 'cashier', 'budi.kasir@restoran.com'),
(3, 'koki1', 'password', 'Chef Andi', 'chef', 'andi.chef@restoran.com'),
(4, 'pelayan1', 'password', 'Siti Pelayan', 'waiter', 'siti.pelayan@restoran.com');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `table_id` (`table_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_id`,`menu_item_id`),
  ADD KEY `menu_item_id` (`menu_item_id`);

--
-- Indexes for table `tables`
--
ALTER TABLE `tables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `table_code` (`table_code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tables`
--
ALTER TABLE `tables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
