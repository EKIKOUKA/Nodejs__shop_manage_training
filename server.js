const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL データーベースを連結
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'test',
  password: 'testtest',
  database: 'myDatabase'
});

db.connect();

// APIを提供する
app.post('/login', (req, res) => {
  const {username, password} = req.body;
  const sql = `SELECT * FROM sp_user WHERE user_email = ?;`
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log("err: ", err)
      return res.status(500).json({success: 0, message: "データーヘースー調べが失敗した"});
    }

    if (result[0] && result[0].password == password) {
      return res.json({
        success: 1,
        userInfo: {username: result[0].username, user_email: result[0].user_email},
        message: "ログイン成功"
      })
    } else {
      console.log("result: ", result)
      return res.json({ success: 0, message: 'アカンウトかパウワードが間違った！' });
    }
  })
});

app.post('/getGoodsList', (req, res) => {
  db.query('SELECT * FROM sp_goods ORDER BY goods_id DESC', (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});
app.post('/addGood', (req, res) => {
  const { goods_name } = req.body;
  const sql = `INSERT INTO sp_goods (goods_name, add_time, upd_time)
               VALUES (?, UNIX_TIMESTAMP(NOW()), UNIX_TIMESTAMP(NOW()));`
  db.query(sql, [goods_name], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});
app.post('/updateGood', (req, res) => {
  const { goods_name, goods_id} = req.body;
  const sql = `UPDATE sp_goods SET goods_name = ? WHERE goods_id = ?;`
  db.query(sql, [goods_name, goods_id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});
app.post('/deleteGood', (req, res) => {
  const { id } = req.body;
  db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
