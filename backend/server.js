require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


const fs = require('fs');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const certRoutes = require('./routes/certificates');


const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to protect admin page routes with HTTP 302 redirect (works even with JS disabled)
const protectedPageRoutes = [
  '/dashboard',
  '/add-certificate',
  '/edit-certificate',
  '/certificate',
  '/certificates'
];

function pageAuthMiddleware(req, res, next) {
  const url = req.path;
  const isProtected = protectedPageRoutes.some(p => url === p || url.startsWith(p + '/'));

  if (isProtected) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return res.redirect('/');
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123!');
      return next();
    } catch (err) {
      return res.redirect('/');
    }
  }

  next();
}

app.use(pageAuthMiddleware);

app.use('/api', authRoutes);
app.use('/api', certRoutes);

// Serve frontend build if present
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const staticPath = fs.existsSync(frontendBuildPath) ? frontendBuildPath : (fs.existsSync(frontendDistPath) ? frontendDistPath : null);

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}


const PORT = process.env.PORT || 5000;


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=> {
    console.log('Mongo connected');
})
.catch(err => console.error('Mongo connection error', err));

app.listen(PORT, () => console.log('Server running on', PORT));

module.exports = app;