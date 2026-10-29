# Stellaris Hotel Management System

## Project Description
Stellaris Hotel Management System is a web-based application designed to organise hotel operations, including room management, guest records, bookings, and payment information.

## Technology Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js and Express.js
- **Database:** MySQL
- **Database Connectivity:** mysql2
- **Package Management:** npm

## Database
Database name: `stellaris_hotel`

The SQL setup script is available at `database/schema.sql`.

## Main Project Files
- `public/index.html` — Main web interface
- `public/style.css` — User interface styling
- `public/app.js` — Frontend JavaScript
- `server.js` — Backend server
- `database/schema.sql` — Database schema
- `.env.example` — Example configuration
- `package.json` — Project dependencies and scripts

## Team Members
- Name: Pradhyum Mundada — Roll Number: 1262241438
- Name: Dhruti Jagtap — Roll Number: 1262241496
- Name: Shivette Singh  — Roll Number:1262241383
- Name: Priyanshu Sinha — Roll Number: 1262243500

## Setup and Execution Instructions

### Prerequisites
- Node.js and npm
- MySQL Server
- MySQL Workbench (recommended)

### 1. Set Up the Database
1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database/schema.sql`.
3. Execute the script to create the database objects.

### 2. Configure Environment Variables
1. Copy `.env.example` to `.env`.
2. Set your local MySQL username and password in `.env`.
3. Set the database name to `stellaris_hotel`.

Never publish `.env` or real database credentials.

### 3. Install Dependencies
From the project root directory, run:

```bash
npm install
```

### 4. Start the Application
Run the start command defined in `package.json`:

```bash
npm start
```

If the server starts on port 3000, open `http://localhost:3000` in your browser.

## Repository
https://github.com/PradhyumMundada/Stellaris-Hotel-Management-System
