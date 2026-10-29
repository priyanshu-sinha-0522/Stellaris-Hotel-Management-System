require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stellaris_hotel', waitForConnections: true,
  connectionLimit: 10, decimalNumbers: true, dateStrings: true
});

const tables = {
  branches: { sql: 'Branch', pk: 'branch_id', columns: ['branch_name','city','address','phone'], fields: [
    ['branch_name','Branch name','text',true],['city','City','text',true],['address','Address','text',true],['phone','Phone','tel',false]] },
  rooms: { sql: 'Room', pk: 'room_no', columns: ['room_type','floor_no','price','branch_id','status','description'], fields: [
    ['room_type','Room type','text',true],['floor_no','Floor','number',true],['price','Price per night (₹)','number',true],['branch_id','Branch','branch',true],['status','Status','roomStatus',true],['description','Description','text',false]] },
  employees: { sql: 'Employee', pk: 'emp_id', columns: ['full_name','email','phone','salary','position','branch_id','employment_status'], fields: [
    ['full_name','Full name','text',true],['email','Email','email',false],['phone','Phone','tel',false],['salary','Monthly salary (₹)','number',true],['position','Position','text',true],['branch_id','Branch','branch',false],['employment_status','Employment status','employeeStatus',true]] },
  attendance: { sql: 'Attendance', pk: 'attendance_id', columns: ['emp_id','attendance_date','status','notes'], fields: [
    ['emp_id','Employee','employee',true],['attendance_date','Date','date',true],['status','Attendance status','attendanceStatus',true],['notes','Notes','text',false]] },
  guests: { sql: 'Guest', pk: 'guest_id', columns: ['name','email','phone_number','address','loyalty_points','discount_percent'], fields: [
    ['name','Full name','text',true],['email','Email','email',false],['phone_number','Phone','tel',false],['address','Address','text',false],['loyalty_points','Loyalty points','number',true],['discount_percent','Discount (%)','number',true]] },
  bookings: { sql: 'Booking', pk: 'booking_id', columns: ['check_in_date','check_out_date','guest_id','status','total_amount'], fields: [
    ['check_in_date','Check-in','date',true],['check_out_date','Check-out','date',true],['guest_id','Guest','guest',true],['status','Booking status','bookingStatus',true],['total_amount','Total amount (₹)','number',true]] },
  payments: { sql: 'Payment', pk: 'payment_id', columns: ['amount','payment_date','booking_id','payment_method','payment_status'], fields: [
    ['amount','Amount (₹)','number',true],['payment_date','Payment date','date',true],['booking_id','Booking','booking',true],['payment_method','Method','paymentMethod',true],['payment_status','Payment status','paymentStatus',true]] }
};
const enumOptions = {
  roomStatus: ['Available','Occupied','Maintenance'], employeeStatus: ['Active','On Leave','Inactive'],
  attendanceStatus: ['Present','Absent','Leave'], bookingStatus: ['Confirmed','Cancelled','Checked-Out'],
  paymentMethod: ['Cash','Card','UPI','Bank Transfer','Pending'], paymentStatus: ['Paid','Partial','Pending','Refunded']
};
const quote = (s) => '`' + s.replace(/`/g, '') + '`';

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: process.env.DB_NAME || 'stellaris_hotel' }); }
  catch (e) { res.status(503).json({ error: 'Cannot connect to MySQL. Check that MySQL is running and your .env settings are correct.' }); }
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  // Local demo gate only. Replace with hashed passwords and sessions before deploying publicly.
  if (username === 'admin' && password === 'admin123') return res.json({ ok: true, user: 'Administrator' });
  return res.status(401).json({ error: 'Incorrect username or password.' });
});
app.get('/api/meta', (_req,res) => res.json(Object.fromEntries(Object.entries(tables).map(([k,v]) => [k,{ label: k[0].toUpperCase()+k.slice(1), pk:v.pk, fields:v.fields }]))));
app.get('/api/lookups', async (_req,res,next) => {
  try {
    const [branches] = await pool.query('SELECT branch_id AS id, branch_name AS label FROM Branch ORDER BY branch_name');
    const [employees] = await pool.query('SELECT emp_id AS id, full_name AS label FROM Employee ORDER BY full_name');
    const [guests] = await pool.query('SELECT guest_id AS id, name AS label FROM Guest ORDER BY name');
    const [bookings] = await pool.query('SELECT booking_id AS id, CONCAT("#",booking_id," · ",check_in_date," — ",check_out_date) AS label FROM Booking ORDER BY booking_id DESC');
    res.json({ branches, employees, guests, bookings, enums: enumOptions });
  } catch(e) { next(e); }
});
app.get('/api/dashboard', async (_req,res,next) => {
  try {
    const [[rooms]] = await pool.query("SELECT COUNT(*) total, SUM(status='Available') available, SUM(status='Occupied') occupied, SUM(status='Maintenance') maintenance FROM Room");
    const [[bookings]] = await pool.query("SELECT COUNT(*) total, SUM(status='Confirmed') confirmed, SUM(status='Cancelled') cancelled, SUM(check_in_date <= CURDATE() AND check_out_date > CURDATE() AND status='Confirmed') in_house FROM Booking");
    const [[guests]] = await pool.query('SELECT COUNT(*) total FROM Guest');
    const [[employees]] = await pool.query("SELECT COUNT(*) total, SUM(employment_status='Active') active FROM Employee");
    const [[revenue]] = await pool.query("SELECT (SELECT COALESCE(SUM(amount),0) FROM Payment WHERE payment_status IN ('Paid','Partial')) collected, (SELECT COALESCE(SUM(total_amount),0) FROM Booking WHERE status <> 'Cancelled') booking_value");
    const [recent] = await pool.query(`SELECT b.booking_id,b.check_in_date,b.check_out_date,b.status,b.total_amount,g.name guest_name,
      GROUP_CONCAT(r.room_no ORDER BY r.room_no SEPARATOR ', ') rooms,
      COALESCE((SELECT SUM(p.amount) FROM Payment p WHERE p.booking_id=b.booking_id AND p.payment_status IN ('Paid','Partial')),0) paid
      FROM Booking b JOIN Guest g ON g.guest_id=b.guest_id LEFT JOIN Room_Booking_Reserve rr ON rr.booking_id=b.booking_id LEFT JOIN Room r ON r.room_no=rr.room_no
      GROUP BY b.booking_id ORDER BY b.created_at DESC LIMIT 6`);
    const [monthly] = await pool.query(`SELECT DATE_FORMAT(payment_date,'%b %Y') month, DATE_FORMAT(payment_date,'%Y-%m') sort_month,
      SUM(CASE WHEN payment_status IN ('Paid','Partial') THEN amount ELSE 0 END) revenue FROM Payment
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH) GROUP BY sort_month,month ORDER BY sort_month`);
    res.json({ rooms, bookings, guests: guests.total, employees, revenue, recent, monthly });
  } catch(e) { next(e); }
});
app.get('/api/rooms/availability', async (req,res,next) => {
  try {
    const checkIn = req.query.checkIn, checkOut = req.query.checkOut;
    if (!checkIn || !checkOut || checkOut <= checkIn) return res.status(400).json({ error: 'Choose a check-out date later than check-in.' });
    const [rows] = await pool.query(`SELECT r.room_no,r.room_type,r.floor_no,r.price,r.status,r.description,b.branch_name,b.city
      FROM Room r JOIN Branch b ON b.branch_id=r.branch_id
      WHERE r.status <> 'Maintenance' AND NOT EXISTS (
        SELECT 1 FROM Room_Booking_Reserve rr JOIN Booking bk ON bk.booking_id=rr.booking_id
        WHERE rr.room_no=r.room_no AND bk.status <> 'Cancelled' AND bk.check_in_date < ? AND bk.check_out_date > ?
      ) ORDER BY r.price`, [checkOut,checkIn]);
    res.json(rows);
  } catch(e) { next(e); }
});
app.get('/api/:resource', async (req,res,next) => {
  const cfg = tables[req.params.resource]; if (!cfg) return res.status(404).json({error:'Unknown resource'});
  try {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit)||250,1),500);
    let sql = `SELECT t.* FROM ${quote(cfg.sql)} t`;
    if (req.params.resource === 'rooms') sql = `SELECT t.*, b.branch_name, b.city FROM Room t JOIN Branch b ON b.branch_id=t.branch_id`;
    if (req.params.resource === 'employees') sql = `SELECT t.*, b.branch_name FROM Employee t LEFT JOIN Branch b ON b.branch_id=t.branch_id`;
    if (req.params.resource === 'attendance') sql = `SELECT t.*, e.full_name AS employee_name FROM Attendance t JOIN Employee e ON e.emp_id=t.emp_id`;
    if (req.params.resource === 'bookings') sql = `SELECT t.*, g.name AS guest_name, (SELECT GROUP_CONCAT(r.room_no ORDER BY r.room_no SEPARATOR ', ') FROM Room_Booking_Reserve rr JOIN Room r ON r.room_no=rr.room_no WHERE rr.booking_id=t.booking_id) AS rooms, (SELECT COALESCE(SUM(p.amount),0) FROM Payment p WHERE p.booking_id=t.booking_id AND p.payment_status IN ('Paid','Partial')) AS paid FROM Booking t JOIN Guest g ON g.guest_id=t.guest_id`;
    if (req.params.resource === 'payments') sql = `SELECT t.*, g.name AS guest_name FROM Payment t JOIN Booking b ON b.booking_id=t.booking_id JOIN Guest g ON g.guest_id=b.guest_id`;
    const searchable = { branches:['branch_name','city','address'], rooms:['room_type','description','status','branch_name','city'], employees:['full_name','email','position','employment_status','branch_name'], attendance:['employee_name','status','notes'], guests:['name','email','phone_number','address'], bookings:['g.name','t.status'], payments:['g.name','t.payment_method','t.payment_status'] }[req.params.resource];
    const params=[];
    if (search && searchable) { sql += ' WHERE ' + searchable.map(c=>`${c} LIKE ?`).join(' OR '); searchable.forEach(()=>params.push(`%${search}%`)); }
    sql += ` ORDER BY ${req.params.resource === 'rooms' ? 't.room_no' : req.params.resource === 'bookings' ? 't.created_at' : '1'} DESC LIMIT ${limit}`;
    const [rows] = await pool.query(sql,params); res.json(rows);
  } catch(e) { next(e); }
});
app.post('/api/:resource', async (req,res,next) => {
  const cfg=tables[req.params.resource]; if(!cfg) return res.status(404).json({error:'Unknown resource'});
  try {
    const body=req.body||{}; const fields=cfg.columns.filter(c=>Object.prototype.hasOwnProperty.call(body,c));
    if(!fields.length) return res.status(400).json({error:'No valid fields supplied.'});
    if(req.params.resource==='bookings') {
      if(!body.check_in_date || !body.check_out_date || body.check_out_date<=body.check_in_date) return res.status(400).json({error:'Check-out must be after check-in.'});
      const roomNo=Number(body.room_no||0);
      if(!roomNo) return res.status(400).json({error:'Choose a room to reserve when creating a booking.'});
      const conn=await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [roomRows]=await conn.query('SELECT room_no,price,status FROM Room WHERE room_no=? FOR UPDATE',[roomNo]);
        if(!roomRows.length || roomRows[0].status==='Maintenance') throw Object.assign(new Error('That room does not exist or is under maintenance.'),{status:400});
        const [conflicts]=await conn.query(`SELECT COUNT(*) n FROM Room_Booking_Reserve rr JOIN Booking b ON b.booking_id=rr.booking_id WHERE rr.room_no=? AND b.status<>'Cancelled' AND b.check_in_date < ? AND b.check_out_date > ?`,[roomNo,body.check_out_date,body.check_in_date]);
        if(conflicts[0].n) throw Object.assign(new Error('That room is already reserved for some of those dates.'),{status:409});
        const [guestRows]=await conn.query('SELECT discount_percent FROM Guest WHERE guest_id=?',[body.guest_id]);
        if(!guestRows.length) throw Object.assign(new Error('Select an existing guest.'),{status:400});
        const nights=(new Date(body.check_out_date+'T00:00:00Z')-new Date(body.check_in_date+'T00:00:00Z'))/86400000;
        const total=Number((nights*roomRows[0].price*(1-Number(guestRows[0].discount_percent)/100)).toFixed(2));
        const [insert]=await conn.query('INSERT INTO Booking (check_in_date,check_out_date,guest_id,status,total_amount) VALUES (?,?,?,?,?)',[body.check_in_date,body.check_out_date,body.guest_id,body.status||'Confirmed',total]);
        await conn.query('INSERT INTO Room_Booking_Reserve (booking_id,room_no) VALUES (?,?)',[insert.insertId,roomNo]);
        await conn.query('INSERT INTO Payment (amount,payment_date,booking_id,payment_method,payment_status) VALUES (?,?,?,?,?)',[0,body.check_in_date,insert.insertId,'Pending','Pending']);
        await conn.query('INSERT INTO Audit_Log (action,table_name,record_id,message) VALUES (?,?,?,?)',['BOOKING_CREATED','Booking',insert.insertId,`Booking created with room ${roomNo}`]);
        await conn.commit(); return res.status(201).json({id:insert.insertId,message:`Booking #${insert.insertId} created. Total: ₹${total.toLocaleString('en-IN')}`});
      } catch(err) { await conn.rollback(); throw err; } finally { conn.release(); }
    }
    const vals=fields.map(c=>body[c]===''?null:body[c]);
    const [result]=await pool.query(`INSERT INTO ${quote(cfg.sql)} (${fields.map(quote).join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,vals);
    await pool.query('INSERT INTO Audit_Log (action,table_name,record_id,message) VALUES (?,?,?,?)',['CREATE',cfg.sql,result.insertId,`Created ${cfg.sql} record`]);
    res.status(201).json({id:result.insertId,message:'Record created.'});
  } catch(e) { next(e); }
});
app.put('/api/:resource/:id', async (req,res,next) => {
  const cfg=tables[req.params.resource]; if(!cfg) return res.status(404).json({error:'Unknown resource'});
  try {
    const body=req.body||{}; const fields=cfg.columns.filter(c=>Object.prototype.hasOwnProperty.call(body,c));
    if(!fields.length) return res.status(400).json({error:'No editable fields supplied.'});
    if(req.params.resource==='bookings' && body.check_in_date && body.check_out_date && body.check_out_date<=body.check_in_date) return res.status(400).json({error:'Check-out must be after check-in.'});
    const vals=fields.map(c=>body[c]===''?null:body[c]); vals.push(req.params.id);
    const [result]=await pool.query(`UPDATE ${quote(cfg.sql)} SET ${fields.map(c=>`${quote(c)}=?`).join(',')} WHERE ${quote(cfg.pk)}=?`,vals);
    if(!result.affectedRows) return res.status(404).json({error:'Record not found.'});
    await pool.query('INSERT INTO Audit_Log (action,table_name,record_id,message) VALUES (?,?,?,?)',['UPDATE',cfg.sql,req.params.id,`Updated ${cfg.sql} record`]);
    res.json({message:'Record updated.'});
  } catch(e) { next(e); }
});
app.delete('/api/:resource/:id', async (req,res,next) => {
  const cfg=tables[req.params.resource]; if(!cfg) return res.status(404).json({error:'Unknown resource'});
  try {
    const [result]=await pool.query(`DELETE FROM ${quote(cfg.sql)} WHERE ${quote(cfg.pk)}=?`,[req.params.id]);
    if(!result.affectedRows) return res.status(404).json({error:'Record not found.'});
    await pool.query('INSERT INTO Audit_Log (action,table_name,record_id,message) VALUES (?,?,?,?)',['DELETE',cfg.sql,req.params.id,`Deleted ${cfg.sql} record`]);
    res.json({message:'Record deleted.'});
  } catch(e) { next(e); }
});
app.use((err,_req,res,_next) => {
  console.error(err);
  const status=err.status || (err.code==='ER_DUP_ENTRY'?409:err.code==='ER_NO_REFERENCED_ROW_2'||err.code==='ER_ROW_IS_REFERENCED_2'?400:500);
  const message=status===500 ? 'Server error. Check the terminal for details.' : (err.code==='ER_DUP_ENTRY'?'A record with that unique value already exists.':err.message);
  res.status(status).json({error:message});
});

app.listen(PORT, () => console.log(`Stellaris is running at http://localhost:${PORT}`));
