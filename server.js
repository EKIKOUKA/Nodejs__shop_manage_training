const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

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

const tempSecrets = {}; // 用於尚未驗證的密鑰

// 1. 產生密鑰並回傳 QR Code（可顯示在瀏覽器）
app.get('/generate-secret', async (req, res) => {
    const userId = req.query.userId || 'test-user';

    const secret = speakeasy.generateSecret({
        name: `shop-sample-TOTP-SECRET-${userId}`
    });

    tempSecrets[userId] = secret.base32;

    const otpAuthUrl = secret.otpauth_url;
    // 産生 QR code (base64 資料 URI)
    const qrImageUrl = await qrcode.toDataURL(otpAuthUrl);

    qrcode.toDataURL(otpAuthUrl, (err, imageData) => {
        if (err) return res.status(500).send('Failed to generate QR code');
        res.send(`
            <div style="text-align: center; font-size: 3em;">
                <img src="${imageData}" style="width: 80%;">
                <p>設定キー</p>
                <div style="white-space: wrap; width: 90%; word-wrap: break-word;
                margin: auto; overflow-wrap: break-word;">${secret.base32}</div>
            </div>
        `);
    });
});
const SECRET_KEY = '@~@iABug91>gB5oiTX9K=s-)peJitnZ)uQVK7Bk~3*2149M##B:--d]Dyn%F}*%q';
// 2. 驗證驗證碼
app.post('/verify', (req, res) => {
    const {userId, token} = req.body;

    const sqlSelect = `SELECT totp_secret FROM sp_user WHERE user_id = ?;`;
    db.query(sqlSelect, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({success: 0, message: '資料庫查詢失敗'});
        }

        const dbSecret = result.length > 0 ? result[0].totp_secret : null;

        if (dbSecret) {
            // 已有密鑰，使用資料庫密鑰驗證
            const verified = speakeasy.totp.verify({
                secret: dbSecret,
                encoding: 'base32',
                token: token,
                window: 1
            });

            if (verified) {
                const Bearer_token = jwt.sign(
                    {userId: result[0].user_id, email: result[0].user_email},
                    SECRET_KEY,
                    {expiresIn: '1d'} // 1s, 1m, 30d, 365d
                );

                return res.json({status: 200, success: 1, token: Bearer_token, message: '成功'});
            } else {
                // fallback 驗證：嘗試使用 tempSecrets 驗證並更新密鑰
                const secret = tempSecrets[userId];
                if (!secret) {
                    return res.json({status: 500, success: 0, message: 'コードは存在しない'});
                }

                const fallbackVerified = speakeasy.totp.verify({
                    secret: secret,
                    encoding: 'base32',
                    token: token,
                    window: 1
                });

                if (fallbackVerified) {
                    const sqlUpdate = `UPDATE sp_user SET totp_secret = ? WHERE user_id = ?;`;
                    db.query(sqlUpdate, [secret, userId], (err, results) => {
                        if (err) {
                            return res.status(500).json({success: 0, message: '密鑰寫入資料庫失敗'});
                        }
                        return res.json({status: 200, success: 1, message: '驗證成功，密鑰已更新'});
                    });
                } else {
                    return res.json({status: 500, success: 0, message: '驗證失敗'});
                }
            }
        } else {
            // 無密鑰，使用 tempSecrets 驗證並儲存
            const secret = tempSecrets[userId];
            if (!secret) {
                return res.status(400).json({success: false, message: 'コードは存在しない'});
            }

            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1
            });

            if (verified) {
                const sqlUpdate = `UPDATE sp_user SET totp_secret = ? WHERE user_id = ?;`;
                db.query(sqlUpdate, [secret, userId], (err, results) => {
                    if (err) {
                        return res.status(500).json({status: 500, success: 0, message: '密鑰寫入資料庫失敗'});
                    }
                    return res.json({status: 200, success: 1, message: '驗證成功，密鑰已儲存'});
                });
            } else {
                return res.json({status: 500, success: 0, message: '驗證失敗'});
            }
        }
    });
});


const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) return res.status(401).json({message: "Tokenが無い"});

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({message: "Tokenが無効"});

        req.user = user;
        next();
    })
}

// APIを提供する
app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const sql = `SELECT * FROM sp_user WHERE user_email = ?;`
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.log("err: ", err)
            return res.json({status: 500, message: "データーヘースー調べが失敗した"});
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
                status: 200,
                userInfo,
                message: "ログイン成功"
            })
        } else {
            console.log("result: ", result)
            return res.json({status: 500, message: 'アカンウトかパウワードが間違った！'});
        }
    })
});

// Good api
app.post('/getGoodsList', verifyToken, (req, res) => {
    db.query('SELECT * FROM sp_goods ORDER BY goods_id DESC', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({status: 200, data: result});
    });
});
app.post('/addGood', verifyToken, (req, res) => {
    const {goods_name} = req.body;
    const sql = `INSERT INTO sp_goods (goods_name, add_time, upd_time)
    VALUES (?, UNIX_TIMESTAMP(NOW()), UNIX_TIMESTAMP(NOW()));`
    db.query(sql, [goods_name], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({status: 200, data: result});
    });
});
app.post('/updateGood', verifyToken, (req, res) => {
    const {goods_name, goods_id} = req.body;
    const sql = `UPDATE sp_goods SET goods_name = ? WHERE goods_id = ?;`
    db.query(sql, [goods_name, goods_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({status: 200, data: result});
    });
});
app.post('/deleteGood', verifyToken, (req, res) => {
    const {id} = req.body;
    db.query(`DELETE FROM sp_goods WHERE goods_id = ${id};`, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({status: 200, data: result});
    });
});


// User api
app.post('/getEducationList', (req, res) => {
    db.promise().query('SELECT edu.sort_order as edu_id, edu.edu_label as label, edu.edu_value as value from sp_education edu').then(([result]) => {
        res.json({
            status: 200,
            data: result
        })
    })
    .catch(err => {
        res.status(500).send(err);
    })
})
app.post('/getUserList', verifyToken, (req, res) => {
    const { current = 1, pageSize = 10, username, gender, user_edu, user_email, isActive } = req.body;
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
    if (typeof isActive !== 'undefined') {
        searchItem += ' AND isActive = ?';
        paramsObj.push(isActive);
    }

    db.promise().query(`SELECT COUNT(*) AS total FROM sp_user ${searchItem}`, paramsObj).then(([countResult]) => {
        const total = countResult[0].total;

        return db.promise().query(`SELECT * FROM sp_user ${searchItem} ORDER BY user_id DESC LIMIT ? OFFSET ?`, [...paramsObj, pageSize, offset]).then(([listResult]) => {
            res.json({
                status: 200,
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

app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
});
