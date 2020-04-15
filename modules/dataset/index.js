const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const DATASET_PATH = path.dirname('/var/www/handwritten/uploads/');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = checkDirectory(file);
    const dirPath = path.join(DATASET_PATH + `/uploads/${dir}`);
    cb(null, dirPath);
  },
  filename: (req, file, cb) => {
    const length = checkDirectoryFilesLength(file);
    const fileName = checkDirectory(file);
    if (length > 10) {
      const error = new Error('Only 10 files are allowed');
      return cb(error, false);
    }
    cb(null, `${fileName}_${length}.png`);
  },
});

const fileFilter = (req, file, cb) => {
  const [, mimeType] = file.mimetype.split('/');
  if (mimeType !== 'png') return cb(new Error('Only image files are allowed!'));
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter,
});

const checkDirectory = (file) => {
  const [directoryName] = file.originalname.split('.');
  const directoryPath = path.join(DATASET_PATH + `/uploads/${directoryName}`);
  if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);
  return directoryName;
};

const checkDirectoryFilesLength = (file) => {
  const [directoryName] = file.originalname.split('.');
  const directoryPath = path.join(DATASET_PATH + `/uploads/${directoryName}`);
  const result = fs.readdirSync(directoryPath);
  return ++result.length;
};

const uploadField = upload.fields([{ name: 'default', maxCount: 4 }]);

router.get('/dataset/checker', (req, res, next) => {
  const { filename } = req.query;
  const directoryPath = path.join(DATASET_PATH + '/uploads/');
  try {
    if (!filename) {
      const error = new Error('Link should has filename query');
      error.statusCode = 422;
      return next(error);
    }

    if (fs.existsSync(directoryPath + filename)) {
      const result = fs.readdirSync(directoryPath + filename);
      if (result.length >= 10) {
        const error = new Error('Directory is full');
        error.statusCode = 400;
        return next(error);
      } else {
        res.status(200).json({
          status: 'success',
          message: 'Filename accepted',
        });
      }
    } else {
      res.status(200).json({
        status: 'success',
        message: 'Filename accepted',
      });
    }
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
});

router.post('/dataset', (req, res, next) => {
  uploadField(req, res, (err) => {
    if (err) return next(err);
    res.status(200).json({
      status: 'success',
      message: 'Image uploaded',
    });
  });
});

router.get('/dataset', (req, res, next) => {
  const { length, paginate, show } = req.query;
  const directoryPath = path.join(DATASET_PATH + '/uploads/');
  try {
    const result = fs.readdirSync(directoryPath);
    let total = 0;
    let resultWithLength = [];
    const errors = [];

    const startIndexPagination = (paginate - 1) * show;
    const endIndexPagination = paginate * show;

    if (length < 0 || length > 10) {
      errors.push({
        type: 'Length Query',
        message: 'Length query accepted those are between 0 - 10',
      });
    }

    if (paginate <= 0) {
      errors.push({
        type: 'Paginate Query',
        message: 'Paginate query accepted are more than 0',
      });
    }

    if (show <= 0) {
      errors.push({
        type: 'Show Query',
        message: 'Show query accepted are more than 0',
      });
    }

    if ((paginate > 0 && (!show || show <= 0)) || (show > 0 && (!paginate || paginate <= 0))) {
      errors.push({
        type: 'Paginate and Show Query',
        message: 'Paginate and Show queries must be available to each other',
      });
    }

    if (errors.length) {
      return res.status(400).json({
        status: 'error',
        errors,
      });
    }

    result.forEach(directory => {
      const innerDirectory = fs.readdirSync(directoryPath + directory);
      if (!length || innerDirectory.length == length) {
        resultWithLength.push({
          fileName: directory,
          length: innerDirectory.length,
        });
        total += innerDirectory.length;
      }
    });

    if (paginate > 0) {
      total = 0;
      resultWithLength = resultWithLength.slice(startIndexPagination, endIndexPagination);
      resultWithLength.forEach(data => {
        total += data.length;
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Successfully fetch dataset',
      dataLength: resultWithLength.length,
      total: total,
      data: resultWithLength,
    });
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
});

module.exports = router;
