const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Certificate = require('../models/Certificate');
const jwt = require('jsonwebtoken');
const { upload, cloudinary } = require('../utils/upload');
const path = require('path');
const fs = require('fs');

// Local disk storage for photos (kept for legacy photo paths if needed)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function authMiddleware(req, res, next) {
  let token = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.split(' ')[1];
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123!');
    req.adminId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// create certificate (accepts multipart form-data if photo uploaded)
router.post('/certificates', authMiddleware, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', JSON.stringify(err, null, 2));
      return res.status(500).json({ message: 'File upload error', detail: err });
    }
    next();
  });
}, async (req, res) => {
  try {
    const body = req.body;
    const uuid = require('crypto').randomBytes(8).toString('hex');
    let photoUrl = '';
    let photoBuffer = null;
    let photoPublicId = '';

    if (req.file) {
      // Save cloudinary file URL
      photoUrl = req.file.path;
      photoPublicId = req.file.filename; // Cloudinary public_id
    }

    const data = {
      uuid,
      name: body.name,
      amana: body.amana,
      baladiya: body.baladiya,
      nationalId: body.nationalId,
      healthCertificateNumber: body.healthCertificateNumber,
      job: body.job,
      nationality: body.nationality,
      gender: body.gender,
      healthCertIssueDate: body.healthCertIssueDate || null,
      healthCertExpiryDate: body.healthCertExpiryDate || null,
      healthCertIssueDateHijri: body.healthCertIssueDateHijri || null,
      healthCertExpiryDateHijri: body.healthCertExpiryDateHijri || null,
      educationalProgram: body.educationalProgram,
      educationalProgramEndDate: body.educationalProgramEndDate || null,
      licenseNumber: body.licenseNumber,
      establishmentName: body.establishmentName,
      establishmentNumber: body.establishmentNumber,
      selectedLogo: body.selectedLogo || 'logos/الرياض.png',
      photoUrl,
      photoBuffer,
      photoPublicId
    };

    // إذا تم تمرير ID اختياري يتم اعتماده كـ ObjectId لمونجو مع التحقق من الهيكسا وعدم التكرار
    const customId = (body._id || body.customId || body.id || '').trim();
    if (customId) {
      if (!/^[0-9a-fA-F]{24}$/.test(customId) || !mongoose.Types.ObjectId.isValid(customId)) {
        return res.status(400).json({ message: 'الآيدي (_id) غير صالح: يجب أن يكون مكوناً من 24 خانة سداسية عشرية (Hexadecimal).' });
      }

      // فحص عدم تكرار الآيدي في قاعدة البيانات
      const existing = await Certificate.findById(new mongoose.Types.ObjectId(customId));
      if (existing) {
        return res.status(400).json({ message: `الآيدي (_id) مكرر بالفعل ومسجل لشهادة باسم "${existing.name || 'موجودة'}". يرجى اختيار آيدي آخر.` });
      }

      data._id = new mongoose.Types.ObjectId(customId);
    }

    const cert = new Certificate(data);
    await cert.save();
    res.json({ success: true, id: cert._id, uuid: cert.uuid });
  } catch (err) {
    console.error('POST /certificates ERROR:', err.message);
    console.error(err.stack);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'يوجد شهادة مسجلة مسبقاً بنفس المعرف (_id أو UUID)', detail: err.message });
    }
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});


// dashboard list (optional ?search= filters by name or nationalId)
router.get('/certificates', authMiddleware, async (req, res) => {
  const search = (req.query.search || '').trim();
  let query = {};
  if (search) {
    // escape regex special chars so user input is treated literally
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query = { $or: [{ name: regex }, { nationalId: regex }] };
  }
  const list = await Certificate.find(query).sort({ createdAt: -1 }).limit(500);
  const host = req.get('host');
  const proto = req.protocol;
  const updatedList = list.map(doc => {
    let obj = doc.toObject();
    if (obj.photoUrl && obj.photoUrl.startsWith('/uploads')) {
      obj.photoUrl = proto + '://' + host + obj.photoUrl;
    }
    return obj;
  });
  res.json(updatedList);
});


// public get by uuid or id
router.get('/certificates/:id', async (req, res) => {
  const id = req.params.id;
  let doc = await Certificate.findOne({ uuid: id });
  if (!doc) doc = await Certificate.findById(id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  // optionally modify photoUrl to be absolute
  const host = req.get('host');
  const proto = req.protocol;
  if (doc.photoUrl && doc.photoUrl.startsWith('/uploads')) {
    doc.photoUrl = proto + '://' + host + doc.photoUrl;
  }
  res.json(doc);
});

// update certificate
router.put('/certificates/:id', authMiddleware, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', JSON.stringify(err, null, 2));
      return res.status(500).json({ message: 'File upload error', detail: err });
    }
    next();
  });
}, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ message: 'Not found' });

    // update fields
    cert.name = body.name || cert.name;
    cert.amana = body.amana || cert.amana;
    cert.baladiya = body.baladiya || cert.baladiya;
    cert.nationalId = body.nationalId || cert.nationalId;
    cert.healthCertificateNumber = body.healthCertificateNumber || cert.healthCertificateNumber;
    cert.job = body.job || cert.job;
    cert.nationality = body.nationality || cert.nationality;
    cert.gender = body.gender || cert.gender;
    cert.healthCertIssueDate = body.healthCertIssueDate || cert.healthCertIssueDate;
    cert.healthCertExpiryDate = body.healthCertExpiryDate || cert.healthCertExpiryDate;
    cert.healthCertIssueDateHijri = body.healthCertIssueDateHijri || cert.healthCertIssueDateHijri;
    cert.healthCertExpiryDateHijri = body.healthCertExpiryDateHijri || cert.healthCertExpiryDateHijri;
    cert.educationalProgram = body.educationalProgram || cert.educationalProgram;
    cert.educationalProgramEndDate = body.educationalProgramEndDate || cert.educationalProgramEndDate;
    cert.licenseNumber = body.licenseNumber || cert.licenseNumber;
    cert.establishmentName = body.establishmentName || cert.establishmentName;
    cert.establishmentNumber = body.establishmentNumber || cert.establishmentNumber;
    cert.selectedLogo = body.selectedLogo || cert.selectedLogo;
    if (typeof body.isLocked !== 'undefined') {
      cert.isLocked = body.isLocked;
    }

    // if new photo uploaded
    if (req.file) {
      // delete old photo if exists
      if (cert.photoPublicId) {
        try {
          if (cert.photoUrl && cert.photoUrl.startsWith('/uploads')) {
            const oldPath = path.join(uploadsDir, cert.photoPublicId);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } else {
            await cloudinary.uploader.destroy(cert.photoPublicId);
          }
        } catch (err) {
          console.log('Error deleting old photo:', err);
        }
      }
      cert.photoUrl = req.file.path;
      cert.photoPublicId = req.file.filename; // Cloudinary public_id
    }

    if (typeof body.isLocked !== 'undefined') {
      cert.isLocked = body.isLocked;
    }
    // check type
    await cert.save();
    console.log('Saved Cert:', cert);
    res.json({ success: true, certificate: cert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete certificate
router.delete('/certificates/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ message: 'Not found' });

    // delete photo if exists
    if (cert.photoPublicId) {
      try {
        if (cert.photoUrl && cert.photoUrl.startsWith('/uploads')) {
          const oldPath = path.join(uploadsDir, cert.photoPublicId);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } else {
          await cloudinary.uploader.destroy(cert.photoPublicId);
        }
      } catch (err) {
        console.log('Error deleting photo:', err);
      }
    }

    await Certificate.findByIdAndDelete(id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// check if a custom _id is valid and available (not duplicate)
router.get('/certificates/check-id/:id', authMiddleware, async (req, res) => {
  try {
    const id = (req.params.id || '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id) || !mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ valid: false, available: false, message: 'الآيدي غير صالح (يجب أن يكون 24 خانة Hexadecimal)' });
    }
    const existing = await Certificate.findById(new mongoose.Types.ObjectId(id));
    if (existing) {
      return res.json({ valid: true, available: false, message: `الآيدي مستخدم بالفعل لشهادة باسم "${existing.name || ''}"` });
    }
    res.json({ valid: true, available: true, message: 'الآيدي متاح للاستخدام وغير مكرر' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get certificate by license number (for autofill)
router.get('/certificates/license/:licenseNumber', authMiddleware, async (req, res) => {
  try {
    const licenseNumber = req.params.licenseNumber;
    // Find the most recent certificate with this license number
    const cert = await Certificate.findOne({ licenseNumber }).sort({ createdAt: -1 });

    if (!cert) {
      return res.json(null);
    }

    res.json(cert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// get next certificate number
router.get('/certificates-next-number', authMiddleware, async (req, res) => {
  try {
    const lastCert = await Certificate.findOne().sort({ createdAt: -1 });
    let nextNumber = '461119526040'; // Default starting number

    if (lastCert && lastCert.healthCertificateNumber) {
      const match = lastCert.healthCertificateNumber.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        nextNumber = lastCert.healthCertificateNumber.replace(match[0], num + 1);
      } else {
        nextNumber = lastCert.healthCertificateNumber + '-1';
      }
    }

    res.json({ nextNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Backup all certificates as JSON
router.get('/certificates-backup', authMiddleware, async (req, res) => {
  try {
    const list = await Certificate.find().sort({ createdAt: -1 });
    const filename = `certificates_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(list);
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ message: 'Server error during backup', detail: err.message });
  }
});

// Restore certificates from JSON backup file or body
const jsonUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/certificates-restore', authMiddleware, jsonUpload.single('file'), async (req, res) => {
  try {
    let rawData = null;
    if (req.file && req.file.buffer) {
      rawData = req.file.buffer.toString('utf8');
    } else if (req.body && req.body.certificates) {
      rawData = req.body.certificates;
    } else if (req.body && typeof req.body === 'object') {
      rawData = req.body;
    }

    if (!rawData) {
      return res.status(400).json({ message: 'لم يتم العثور على ملف أو بيانات للاستيراد' });
    }

    let parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const certs = Array.isArray(parsed) ? parsed : (parsed.certificates || [parsed]);

    if (!Array.isArray(certs) || certs.length === 0) {
      return res.status(400).json({ message: 'الملف فارغ أو لا يحتوي على شهادات صالحة' });
    }

    let count = 0;
    for (const item of certs) {
      try {
        const updateData = { ...item };
        const customId = updateData._id;
        delete updateData._id; // MongoDB immutable field
        delete updateData.__v;

        // Parse dates safely
        if (updateData.healthCertIssueDate) {
          const d = new Date(updateData.healthCertIssueDate);
          updateData.healthCertIssueDate = !isNaN(d) ? d : null;
        }
        if (updateData.healthCertExpiryDate) {
          const d = new Date(updateData.healthCertExpiryDate);
          updateData.healthCertExpiryDate = !isNaN(d) ? d : null;
        }
        if (updateData.educationalProgramEndDate) {
          const d = new Date(updateData.educationalProgramEndDate);
          updateData.educationalProgramEndDate = !isNaN(d) ? d : null;
        }

        // Search for existing certificate by:
        // 1. _id (if valid ObjectId)
        // 2. uuid
        // 3. healthCertificateNumber
        let existing = null;
        if (customId && mongoose.Types.ObjectId.isValid(customId)) {
          existing = await Certificate.findById(new mongoose.Types.ObjectId(customId));
        }
        if (!existing && updateData.uuid) {
          existing = await Certificate.findOne({ uuid: updateData.uuid });
        }
        if (!existing && updateData.healthCertificateNumber) {
          existing = await Certificate.findOne({ healthCertificateNumber: updateData.healthCertificateNumber });
        }

        if (existing) {
          // Update existing document
          for (const key of Object.keys(updateData)) {
            existing[key] = updateData[key];
          }
          await existing.save();
        } else {
          // Create new record with original _id if valid
          if (customId && mongoose.Types.ObjectId.isValid(customId)) {
            updateData._id = new mongoose.Types.ObjectId(customId);
          }
          if (!updateData.uuid) {
            updateData.uuid = require('crypto').randomBytes(8).toString('hex');
          }
          const newDoc = new Certificate(updateData);
          await newDoc.save();
        }
        count++;
      } catch (itemErr) {
        console.error('Error importing single certificate:', item?.name || item?._id, itemErr.message);
      }
    }

    res.json({ success: true, count, total: certs.length, message: `تم استيراد واسترجاع ${count} شهادة بنجاح` });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء استيراد البيانات', detail: err.message });
  }
});


module.exports = router;