const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// MySQL データーベースを連結
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'user',
    password: 'user1024',
    database: 'shop_manage_sample'
});
db.connect();

const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) return res.status(401).json({success: 0, message: "Tokenが無い"});

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({success: 0, message: "Tokenが無効"});

        req.user = user;
        next();
    })
}

const tempSecrets = {}; // 用於尚未驗證的密鑰

// 1. 產生密鑰並回傳 QR Code（可顯示在瀏覽器）
app.post('/generate-secret', verifyToken, async (req, res) => {
    const {userId} = req.body || 'test-user';

    const secret = speakeasy.generateSecret({
        name: `shop-sample-TOTP-SECRET-${userId}`
    });

    tempSecrets[userId] = secret.base32;

    const otpAuthUrl = secret.otpauth_url;
    // 産生 QR code (base64 資料 URI)
    const qrImageUrl = await qrcode.toDataURL(otpAuthUrl);

    qrcode.toDataURL(otpAuthUrl, (err, imageData) => {
        if (err) return res.status(500).send('Failed to generate QR code');
        res.send({success: 1, data: {imageData, secret: secret.base32}});
    });
});
const SECRET_KEY = '@~@iABug91>gB5oiTX9K=s-)peJitnZ)uQVK7Bk~3*2149M##B:--d]Dyn%F}*%q';
app.post('/verify-login-totp', (req, res) => {
    const { userId, token } = req.body;

    const sql = `SELECT totp_secret, user_email FROM sp_user WHERE user_id = ?`;
    db.query(sql, [userId], (err, result) => {
        if (err || !result.length) {
            return res.status(500).json({ success: 0, message: 'ユーザー取得失敗' });
        }

        const dbSecret = result[0].totp_secret;
        const verified = speakeasy.totp.verify({
            secret: dbSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ success: 0, message: 'TOTPコードが正しくありません' });
        }

        const tokenJwt = jwt.sign(
            { userId, email: result[0].user_email },
            SECRET_KEY,
            { expiresIn: '1d' }
        );

        res.json({ success: 1, token: tokenJwt, message: 'TOTP認証成功' });
    });
});
app.post('/verify-setup-totp', verifyToken, (req, res) => {
    const { userId, token } = req.body;
    const secret = tempSecrets[userId];

    if (!secret) {
        return res.status(400).json({ success: 0, message: 'コード未生成' });
    }

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (!verified) {
        return res.status(400).json({ success: 0, message: 'TOTP認証失敗' });
    }

    const sql = `UPDATE sp_user SET totp_secret = ? WHERE user_id = ?`;
    db.query(sql, [secret, userId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: 0, message: 'TOTP保存失敗' });
        }
        delete tempSecrets[userId];
        res.json({ success: 1, message: 'TOTP設定完了' });
    });
});


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

            const Bearer_token = jwt.sign(
                {userId: result[0].user_id, email: result[0].user_email},
                SECRET_KEY,
                {expiresIn: '1d'} // 1s, 1m, 30d, 365d
            );
            let userInfo = {
                userId: result[0].user_id,
                username: result[0].username,
                user_email: result[0].user_email,
                avatar: result[0].avatar
            }
            if (result[0].totp_secret) {
                userInfo.totp_secret = true
            } else {
                userInfo.totp_secret = false
                userInfo.token = Bearer_token
            }
            return res.json({
                success: 1,
                userInfo,
                message: "ログイン成功"
            })
        } else {
            console.log("result: ", result)
            return res.status(400).json({success: 0, message: 'アカンウトかパウワードが間違った！'});
        }
    })
});

// Good api
app.post('/getGoodsList', verifyToken, (req, res) => {
    db.query('SELECT add_time, goods_id, goods_name, goods_number, goods_price FROM sp_goods ORDER BY goods_id DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
});
app.post('/addGood', verifyToken, (req, res) => {
    const {goods_name, goods_number, goods_price} = req.body;
    const sql = `INSERT INTO sp_goods (goods_name, goods_number, goods_price, add_time, upd_time)
    VALUES (?, ?, ?, UNIX_TIMESTAMP(NOW()), UNIX_TIMESTAMP(NOW()));`
    db.query(sql, [goods_name, goods_number, goods_price], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
});
app.post('/updateGood', verifyToken, (req, res) => {
    const {goods_id, goods_name, goods_number, goods_price} = req.body;
    const sql = `UPDATE sp_goods SET goods_name = ?, goods_number = ?, goods_price = ? WHERE goods_id = ?;`
    db.query(sql, [goods_name, goods_number, goods_price, goods_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, message: "更新成功"});
    });
});
app.post('/deleteGood', verifyToken, (req, res) => {
    const {id} = req.body;
    db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
});
app.post('/getOrdersList', verifyToken, (req, res) => {
    db.query('SELECT * FROM sp_order', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
});

// User api
app.post('/getEducationList', verifyToken, (req, res) => {
    db.query('SELECT edu.sort_order as edu_id, edu.edu_value as label from sp_education edu', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    })
})
app.post('/getUserList', verifyToken, (req, res) => {
    const { current = 1, pageSize = 10, username, gender, user_edu, user_email, isActive = 1 } = req.body;
    const offset = (current - 1) * pageSize;
    let searchItem = 'WHERE 1 = 1';
    const paramsObj = [];
    if (username) {
        searchItem += ' AND username LIKE ?';
        paramsObj.push(`%${username}%`);
    }
    if (gender) {
        searchItem += ' AND gender = ?';
        paramsObj.push(gender);
    }
    if (user_edu) {
        searchItem += ' AND user_edu = ?';
        paramsObj.push(user_edu);
    }
    if (user_email) {
        searchItem += ' AND user_email LIKE ?';
        paramsObj.push(`%${user_email}%`);
    }
    searchItem += ' AND isActive = ?';
    paramsObj.push(isActive);

    db.promise().query(`SELECT COUNT(*) AS total FROM sp_user ${searchItem}`, paramsObj).then(([countResult]) => {
        const total = countResult[0].total;

        return db.promise().query(`SELECT avatar, create_time, gender, isActive, update_time, user_edu, user_email, user_id, user_tel, username FROM sp_user ${searchItem} ORDER BY user_id DESC LIMIT ? OFFSET ?`, [...paramsObj, pageSize, offset]).then(([listResult]) => {
            res.json({
                success: 1,
                data: listResult,
                current,
                pageSize,
                total
            });
        });
    })
    .catch(err => {
        res.status(500).send(err);
    });
});
app.post('/addUser', verifyToken, (req, res) => {
    const { username, avatar, gender, user_edu, user_email, isActive } = req.body;
    const sql = `INSERT INTO sp_user (username, avatar, gender, user_edu, user_email, isActive)
    VALUES (?, ?, ?, ?, ?, ?);`
    db.query(sql, [username, avatar, gender, user_edu, user_email, isActive], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
})
app.post('/updateUserActive', verifyToken, (req, res) => {
    const {isActive, user_id} = req.body;
    const sql = `UPDATE sp_user SET isActive = ? WHERE user_id = ?;`
    db.query(sql, [isActive, user_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, data: result});
    });
});
app.post('/updateUser', verifyToken, (req, res) => {
    const {user_id, username, avatar, gender, user_edu, user_email, isActive} = req.body;
    const sql = `UPDATE sp_user SET username = ?, avatar = ?, gender = ?, user_edu = ?, user_email = ?, isActive = ? WHERE user_id = ?;`
    db.query(sql, [username, avatar, gender, user_edu, user_email, isActive, user_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, message: "更新成功"});
    });
});
app.post('/deleteUser', verifyToken, (req, res) => {
    const {user_id} = req.body;
    db.query(`DELETE FROM sp_user WHERE user_id = ${user_id};`, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({success: 1, message: "削除成功"});
    });
});
// 設定儲存位置與檔名
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/home/Project/React_shop_manage__nodejs/uploads');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
        cb(null, name);
    }
});
const upload = multer({ storage });
// 接收圖片上傳
app.post('/upload', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: 0, message: 'No file uploaded' });

    const fileUrl = `https://www.makotodeveloper.website/shop_sample/uploads/${req.file.filename}`;
    res.json({ success: 1, url: fileUrl });
});
app.post('/upload-file-delete', verifyToken, (req, res) => {
    const {avatar} = req.body;
    if (!avatar) {
        return res.status(400).json({ success: 0, message: '刪除失敗，ファイルパースが提供しない' });
    }

    const filename = path.basename(avatar);
    const filePath = path.join('/home/Project/React_shop_manage__nodejs/uploads', filename);

    // ファイルが存在すると、刪除して
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ success: 0, message: 'ファイルは存在しない' });
        }

        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ success: 0, message: '刪除失敗' });
            }

            return res.json({ success: 1, message: '刪除成功' });
        });
    });
})
app.use('/uploads', express.static('/home/Project/React_shop_manage__nodejs/uploads'));

app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
});
