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
  const { id } = req.body;
  console.log("id: ", id);
  db.query('SELECT * FROM sp_goods', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/addGood', (req, res) => {
  const { user_name, } = req.body;
  const sql = `INSERT INTO sp_goods (user_name, mail_address, password, created, modified)
    VALUES (?, ?, ?, now(), now());`
  db.query(sql, [user_name], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/updateGood', (req, res) => {
  const { user_name, goods_id} = req.body;
  const sql = `UPDATE sp_goods SET user_name = ?, mail_address = ? WHERE goods_id = ?;`
  db.query(sql, [user_name, goods_id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
app.post('/deleteGood', (req, res) => {
  const { id } = req.body;
  db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
