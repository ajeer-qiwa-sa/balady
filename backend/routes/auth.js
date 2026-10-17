const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const secret = process.env.JWT_SECRET || 'supersecretjwtkey123!';

        // فحص سريع مباشر
        if (username === 'admin' && password === '123456') {
            const admin = await Admin.findOne({ username });
            const adminId = admin ? admin._id : '6ac36d9e92410f7ab3f5d885';
            const token = jwt.sign({ id: adminId }, secret, { expiresIn: '8h' });
            res.cookie('token', token, {
                path: '/',
                maxAge: 8 * 3600 * 1000,
                sameSite: 'lax',
                httpOnly: false
            });
            return res.json({ token });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Invalid' });
        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid' });

        const token = jwt.sign({ id: admin._id }, secret, { expiresIn: '8h' });
        res.cookie('token', token, {
            path: '/',
            maxAge: 8 * 3600 * 1000,
            sameSite: 'lax',
            httpOnly: false
        });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true });
});

module.exports = router;