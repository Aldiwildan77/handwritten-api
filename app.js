const express = require('express');
const multer = require('multer');
const logger = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5015;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATASET_PATH = 'yourpath';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = checkDirectory(file);
    let dirPath = path.join(DATASET_PATH + `/uploads/${dir}`);
    cb(null, dirPath);
  },
  filename: (req, file, cb) => {
    let length = checkDirectoryFilesLength(file);
    let fileName = checkDirectory(file);
    if (length > 10) {
      const error = new Error('Only 10 files are allowed');
      return cb(error, false);
    }
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
    message: 'Hello World',
  });
});

app.post('/api/dataset', (req, res, next) => {
  uploadField(req, res, (err) => {
    if (err) return next(err);
    res.status(200).json({
      status: 'success',
      message: 'Image uploaded',
    });
  });
});

app.get('/api/dataset/checker', (req, res, next) => {
  const { filename } = req.query;
  const directoryPath = path.join(DATASET_PATH + '/uploads/');
  try {
    if (!filename) {
      const error = new Error('Link should has filename query');
      error.statusCode = 422;
      return next(error);
    }

    let { length } = fs.readdirSync(directoryPath + filename);
    if (length == 10) {
      const error = new Error('Directory is full');
      error.statusCode = 400;
      return next(error);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Filename accepted',
    });
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
});

app.get('/api/dataset', (req, res, next) => {
  const { length, paginate } = req.query;
  const directoryPath = path.join(DATASET_PATH + '/uploads/');
  try {
    let result = fs.readdirSync(directoryPath);
    let resultWithLength = [];
    let errors = [];

    if (length < 0 || length > 10) {
      errors.push({
        type: 'Length Query',
        message: 'Length query accepted those are between 0 - 10',
      });
    }

    if (paginate < 0) {
      errors.push({
        type: 'Paginate Query',
        message: 'Paginate query accepted are more than or equal to 0',
      });
    }

    if (errors.length) {
      return res.status(400).json({
        status: 'error',
        errors,
      });
    }

    result.forEach(directory => {
      let innerDirectory = fs.readdirSync(directoryPath + directory);
      if (resultWithLength.length >= paginate) return;
      if (!length || innerDirectory.length == length) {
        resultWithLength.push({
          fileName: directory,
          length: innerDirectory.length,
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: resultWithLength,
    });
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
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
