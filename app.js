const express = require('express');
const multer = require('multer');
const logger = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5015;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATASET_PATH = path.dirname('/var/www/handwritten/uploads/');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = checkDirectory(file);
    let dirPath = path.join(DATASET_PATH + `/uploads/${dir}`);
    cb(null, dirPath);
  },
  filename: (req, file, cb) => {
    let length = checkDirectoryFilesLength(file);
    let fileName = checkDirectory(file);
    cb(null, `${fileName}_${length}.png`);
  }
});

const fileFilter = (req, file, cb) => {
  let mimeType = file.mimetype.split('/')[1];
  if (mimeType !== 'png') return cb(new Error('Only image files are allowed!'));
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1
  },
  fileFilter
});

// Middleware
app.use(logger(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const checkDirectory = (file) => {
  const directoryName = file.originalname.split('.')[0];
  const directoryPath = path.join(DATASET_PATH + `/uploads/${directoryName}`);
  if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);
  return directoryName;
};

const checkDirectoryFilesLength = (file) => {
  const directoryName = file.originalname.split('.')[0];
  const directoryPath = path.join(DATASET_PATH + `/uploads/${directoryName}`);
  let result = fs.readdirSync(directoryPath);
  return ++result.length;
};

const uploadField = upload.fields([{ name: 'default', maxCount: 4 }]);

// Routes
app.get('/', (req, res, next) => {
  res.status(200).json({
    message: 'Hello World'
  });
});

app.post('/api/dataset', (req, res, next) => {
  console.log('POST /api/dataset');
  uploadField(req, res, (err) => {
    if (err) return next(err);
    res.status(200).json({
      status: 'success',
      message: 'Image uploaded'
    });
  });
});

// Error Handlers
app.use('*', (req, res, next) => {
  const error = new Error('Not Found - ' + req.originalUrl);
  error.statusCode = 404;
  next(error);
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message
  });
});

// Listening
app.listen(PORT, () => console.log('Server is running..'));
