const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 連接 MySQL 資料庫
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'rootroot',
  database: 'myDatabase'
});

db.connect();

// 提供API資料
app.post('/getGoodsList', (req, res) => {
  console.log("/api/getGoodsList requested");
  db.query('SELECT * FROM sp_goods ORDER BY goods_id DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/addGood', (req, res) => {
  console.log("/api/addGood requested");
  const { goods_name } = req.body;
  const sql = `INSERT INTO sp_goods (goods_name, add_time, upd_time)
    VALUES (?, UNIX_TIMESTAMP(NOW()), UNIX_TIMESTAMP(NOW()));`
  db.query(sql, [goods_name], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/updateGood', (req, res) => {
  console.log("/api/updateGood requested");
  const { goods_name, goods_id} = req.body;
  const sql = `UPDATE sp_goods SET goods_name = ? WHERE goods_id = ?;`
  db.query(sql, [goods_name, goods_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/deleteGood', (req, res) => {
  console.log("/api/deleteGood requested");
  const { id } = req.body;
  db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
