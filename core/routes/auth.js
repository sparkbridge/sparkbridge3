const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (webManager) => {
    const router = express.Router();

    router.post('/login', (req, res) => {
        const { password } = req.body;
        // console.log(webManager.adminPassword,password);
        if(webManager.adminPassword === '*'){
            if(password === webManager.mixpassword){
                const token = jwt.sign({ role: 'admin' }, webManager.jwtSecret, { expiresIn: '1h' });
                return res.json({ code: 200, token });
            }
        }
        if (password === webManager.adminPassword) {
            const token = jwt.sign({ role: 'admin' }, webManager.jwtSecret, { expiresIn: '1h' });
            return res.json({ code: 200, token });
        }
        res.status(200).json({ code: 401, msg: '密码错误' });
    });

    router.get('/verify', webManager.requireAuth, (req, res) => {
        // console.log(req.user);
        res.json({
            code: 200,
            msg: 'Token 有效',
            data: {
                user: req.user, // 中间件解析出的用户信息
                exp: req.user.exp // 过期时间戳
            }
        });
    });

    return router;
};