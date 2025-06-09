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
const jwt = require('jsonwebtoken');
const SECRET_KEY = '@~@iABug91>gB5oiTX9K=s-)peJitnZ)uQVK7Bk~3*2149M##B:--d]Dyn%F}*%q';

const verifyToken = (req, res, next) => {    
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Tokenが無い" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Tokenが無効" });
        
        req.user = user;
        next();
    })
}

db.connect();

// APIを提供する
app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const sql = `SELECT * FROM sp_user WHERE user_email = ?;`
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.log("err: ", err)
	          return res.status(500).json({status: 200, message: "データーヘースー調べが失敗した"});
        }

        if (result[0] && result[0].password == password) {
    	    const token = jwt.sign(
    	        { userId: result[0].id, email: result[0].user_email },
    	        SECRET_KEY,
    		      { expiresIn: '7d' } // 1s, 1m, 30d, 365d
          );
  
          return res.json({
              status: 200,
              token,
              userInfo: {
                username: result[0].username, 
                user_email: result[0].user_email
              },
    	        message: "ログイン成功" 
    	    })
        } else {
	          console.log("result: ", result)
            return res.json({ status: 200, message: 'アカンウトかパウワードが間違った！' });
        }
    })
});

app.post('/getGoodsList', verifyToken, (req, res) => {
  db.query('SELECT * FROM sp_goods ORDER BY goods_id DESC', (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({status: 200, data: result});
  });
});
app.post('/addGood', verifyToken, (req, res) => {
  const { goods_name } = req.body;
  const sql = `INSERT INTO sp_goods (goods_name, add_time, upd_time)
    VALUES (?, UNIX_TIMESTAMP(NOW()), UNIX_TIMESTAMP(NOW()));`
  db.query(sql, [goods_name], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({status: 200, data: result});
  });
});
app.post('/updateGood', verifyToken, (req, res) => {
  const { goods_name, goods_id} = req.body;
  const sql = `UPDATE sp_goods SET goods_name = ? WHERE goods_id = ?;`
  db.query(sql, [goods_name, goods_id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({status: 200, data: result});
  });
});
app.post('/deleteGood', verifyToken, (req, res) => {
  const { id } = req.body;
  db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({status: 200, data: result});
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
