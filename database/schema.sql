-- Stellaris Hotel Management System - MySQL 8.0+
-- Fictional demonstration data. Import this file into MySQL Workbench.
CREATE DATABASE IF NOT EXISTS stellaris_hotel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stellaris_hotel;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Audit_Log;
DROP TABLE IF EXISTS Room_Booking_Reserve;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Attendance;
DROP TABLE IF EXISTS Booking;
DROP TABLE IF EXISTS Guest;
DROP TABLE IF EXISTS Room;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Branch;
DROP TABLE IF EXISTS Admin;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Admin (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Branch (
  branch_id INT PRIMARY KEY AUTO_INCREMENT,
  branch_name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(25),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Employee (
  emp_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE,
  phone VARCHAR(25),
  salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  position VARCHAR(100) NOT NULL,
  branch_id INT NULL,
  employment_status ENUM('Active','On Leave','Inactive') NOT NULL DEFAULT 'Active',
  FOREIGN KEY (branch_id) REFERENCES Branch(branch_id) ON DELETE SET NULL
);
CREATE TABLE Attendance (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  emp_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present','Absent','Leave') NOT NULL DEFAULT 'Present',
  notes VARCHAR(255),
  FOREIGN KEY (emp_id) REFERENCES Employee(emp_id) ON DELETE CASCADE,
  UNIQUE KEY uq_employee_attendance_day (emp_id, attendance_date)
);
CREATE TABLE Room (
  room_no INT PRIMARY KEY AUTO_INCREMENT,
  room_type VARCHAR(60) NOT NULL,
  floor_no INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  branch_id INT NOT NULL,
  status ENUM('Available','Occupied','Maintenance') NOT NULL DEFAULT 'Available',
  description VARCHAR(255),
  FOREIGN KEY (branch_id) REFERENCES Branch(branch_id) ON DELETE RESTRICT
);
CREATE TABLE Guest (
  guest_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE,
  phone_number VARCHAR(25),
  address VARCHAR(255),
  loyalty_points INT NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Booking (
  booking_id INT PRIMARY KEY AUTO_INCREMENT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_id INT NOT NULL,
  status ENUM('Confirmed','Cancelled','Checked-Out') NOT NULL DEFAULT 'Confirmed',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES Guest(guest_id) ON DELETE RESTRICT,
  CONSTRAINT chk_booking_dates CHECK (check_out_date > check_in_date)
);
CREATE TABLE Room_Booking_Reserve (
  booking_id INT NOT NULL,
  room_no INT NOT NULL,
  PRIMARY KEY (booking_id, room_no),
  FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (room_no) REFERENCES Room(room_no) ON DELETE RESTRICT
);
CREATE TABLE Payment (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  booking_id INT NOT NULL,
  payment_method ENUM('Cash','Card','UPI','Bank Transfer','Pending') NOT NULL DEFAULT 'Pending',
  payment_status ENUM('Paid','Partial','Pending','Refunded') NOT NULL DEFAULT 'Pending',
  FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
);
CREATE TABLE Audit_Log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(60) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NULL,
  message TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo login: admin / admin123 (application demo gate; configure a real auth system before production).
INSERT INTO Admin (username, password_hash) VALUES ('admin', 'admin123');
INSERT INTO Branch (branch_name, city, address, phone) VALUES
('Stellaris Grand', 'Pune', 'Koregaon Park, Pune, Maharashtra', '+91 20 4100 2100'),
('Stellaris Seaview', 'Mumbai', 'Marine Drive, Mumbai, Maharashtra', '+91 22 4100 2200'),
('Stellaris Heritage', 'Jaipur', 'Civil Lines, Jaipur, Rajasthan', '+91 141 4100 2300');
INSERT INTO Employee (full_name,email,phone,salary,position,branch_id,employment_status) VALUES
('Aarav Mehta','aarav.mehta@example.com','+91 90000 10001',52000,'Front Office Manager',1,'Active'),
('Ishita Rao','ishita.rao@example.com','+91 90000 10002',32000,'Receptionist',1,'Active'),
('Kabir Nair','kabir.nair@example.com','+91 90000 10003',28500,'Housekeeping Supervisor',1,'Active'),
('Meera Shah','meera.shah@example.com','+91 90000 10004',61000,'Branch Manager',2,'Active'),
('Rohan Kapoor','rohan.kapoor@example.com','+91 90000 10005',35000,'Guest Relations Executive',2,'On Leave'),
('Ananya Singh','ananya.singh@example.com','+91 90000 10006',59000,'Branch Manager',3,'Active');
INSERT INTO Room (room_no,room_type,floor_no,price,branch_id,status,description) VALUES
(101,'Deluxe King',1,4800,1,'Available','King bed, work desk and city view'),
(102,'Deluxe Twin',1,4500,1,'Occupied','Twin beds and complimentary breakfast'),
(201,'Executive Suite',2,8200,1,'Available','Separate lounge and premium amenities'),
(202,'Family Room',2,6800,1,'Maintenance','Four-person room; scheduled maintenance'),
(301,'Sea View Deluxe',3,7600,2,'Available','Panoramic sea view and balcony'),
(302,'Premium Suite',3,12500,2,'Occupied','Sea-facing suite with lounge'),
(303,'Classic Queen',3,5200,2,'Available','Queen bed and work area'),
(401,'Heritage Deluxe',1,5900,3,'Available','Traditional decor and modern comforts'),
(402,'Royal Suite',2,11000,3,'Available','Large suite with separate sitting room'),
(403,'Classic Twin',1,4200,3,'Available','Twin beds and garden view');
INSERT INTO Guest (name,email,phone_number,address,loyalty_points,discount_percent) VALUES
('Nisha Verma','nisha.verma@example.com','+91 98100 11001','Bandra West, Mumbai',640,10.00),
('Arjun Desai','arjun.desai@example.com','+91 98200 11002','Baner, Pune',280,0.00),
('Sara Thomas','sara.thomas@example.com','+91 98300 11003','Indiranagar, Bengaluru',920,10.00),
('Dev Malhotra','dev.malhotra@example.com','+91 98400 11004','Civil Lines, Delhi',120,0.00),
('Priya Iyer','priya.iyer@example.com','+91 98500 11005','Adyar, Chennai',410,5.00),
('Reyansh Joshi','reyansh.joshi@example.com','+91 98600 11006','Viman Nagar, Pune',75,0.00),
('Tara Khanna','tara.khanna@example.com','+91 98700 11007','C-Scheme, Jaipur',510,10.00),
('Neil Fernandes','neil.fernandes@example.com','+91 98800 11008','Powai, Mumbai',190,0.00);
INSERT INTO Booking (booking_id,check_in_date,check_out_date,guest_id,status,total_amount) VALUES
(1001,DATE_SUB(CURDATE(), INTERVAL 18 DAY),DATE_SUB(CURDATE(), INTERVAL 15 DAY),1,'Checked-Out',12960),
(1002,DATE_SUB(CURDATE(), INTERVAL 3 DAY),DATE_ADD(CURDATE(), INTERVAL 2 DAY),2,'Confirmed',22500),
(1003,DATE_ADD(CURDATE(), INTERVAL 1 DAY),DATE_ADD(CURDATE(), INTERVAL 4 DAY),3,'Confirmed',24600),
(1004,DATE_ADD(CURDATE(), INTERVAL 5 DAY),DATE_ADD(CURDATE(), INTERVAL 7 DAY),4,'Confirmed',15200),
(1005,DATE_SUB(CURDATE(), INTERVAL 30 DAY),DATE_SUB(CURDATE(), INTERVAL 27 DAY),5,'Cancelled',15600),
(1006,DATE_ADD(CURDATE(), INTERVAL 9 DAY),DATE_ADD(CURDATE(), INTERVAL 12 DAY),7,'Confirmed',33000);
INSERT INTO Room_Booking_Reserve (booking_id,room_no) VALUES (1001,101),(1002,102),(1003,201),(1004,301),(1005,303),(1006,402);
INSERT INTO Payment (amount,payment_date,booking_id,payment_method,payment_status) VALUES
(12960,DATE_SUB(CURDATE(), INTERVAL 18 DAY),1001,'Card','Paid'),
(10000,CURDATE(),1002,'UPI','Partial'),
(0,CURDATE(),1003,'Pending','Pending'),
(15200,CURDATE(),1004,'Card','Paid'),
(0,DATE_SUB(CURDATE(), INTERVAL 30 DAY),1005,'Pending','Refunded'),
(16500,CURDATE(),1006,'Bank Transfer','Partial');
INSERT INTO Attendance (emp_id,attendance_date,status,notes) VALUES
(1,CURDATE(),'Present','Morning shift'),(2,CURDATE(),'Present','Front desk'),(3,CURDATE(),'Present','Housekeeping floor 1'),
(4,CURDATE(),'Present','Opening shift'),(5,CURDATE(),'Leave','Approved leave'),(6,CURDATE(),'Present','Opening shift'),
(1,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Present',''),(2,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Absent','Reported absent'),
(3,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Present',''),(4,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Present',''),
(5,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Present',''),(6,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Present','');
INSERT INTO Audit_Log (action,table_name,record_id,message) VALUES
('SEED_DATA','System',NULL,'Fictional demonstration records loaded for local development.');
