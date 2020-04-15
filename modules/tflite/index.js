const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const MODELS_NAME = ['character', 'word'];
const MODELS_EXTENSION = '.tflite';
const MODELS_PATH = '/var/www/handwritten/models';

const getLatestTfliteModel = async (modelType) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const directoryPath = path.join(`${MODELS_PATH}/${modelType}/`);
    const modelResults = fs.readdirSync(directoryPath);
    const modelVersion = path.parse(directoryPath + modelResults[modelResults.length - 1]).name;
    if (modelResults.length === 0 || modelVersion === undefined) {
      return null;
    }

    return {
      type: modelType,
      version: modelVersion.split('_')[1],
      name: modelResults[modelResults.length - 1],
    };
  } catch (error) {
    throw error;
  }
};

const compareVersion = (oldVersion, latestVersion) => {
  if (typeof oldVersion !== 'string') return false;
  if (typeof latestVersion !== 'string') return false;
  oldVersion = oldVersion.split('.');
  latestVersion = latestVersion.split('.');
  const k = Math.min(oldVersion.length, latestVersion.length);
  for (let i = 0; i < k; ++i) {
    oldVersion[i] = parseInt(oldVersion[i], 10);
    latestVersion[i] = parseInt(latestVersion[i], 10);
    if (oldVersion[i] > latestVersion[i]) return 1;
    if (oldVersion[i] < latestVersion[i]) return -1;
  }
  return oldVersion.length == latestVersion.length ? 0 : (oldVersion.length < latestVersion.length ? -1 : 1);
};

const fileNameResult = (filename) => filename.replace(MODELS_EXTENSION, '').split('_');

router.get('/models/download', async (req, res, next) => {
  const { version, type } = req.query;
  const errors = [];

  if (!version) {
    errors.push({
      type: 'Version Query',
      message: 'Version query could not be empty',
    });
  }

  if (!type) {
    errors.push({
      type: 'Type Query',
      message: 'Type query could not be empty',
    });
  }

  if (errors.length) {
    return res.status(400).json({
      status: 'error',
      errors,
    });
  }

  const filename = version === 'latest' ? (await getLatestTfliteModel(type)).name : `${type}_${version}${MODELS_EXTENSION}`;
  const pathfile = `${MODELS_PATH}/${type}/${filename}`;
  res.download(pathfile, (err) => {
    if (err) {
      const error = new Error('Model version not found!');
      error.statusCode = 404;
      return next(error);
    }
  });
});

router.get('/models/latest', async (req, res, next) => {
  let { type } = req.query;
  try {
    type = type.toLowerCase();
    if (!MODELS_NAME.includes(type)) {
      const error = new Error('Cannot find models type');
      error.statusCode = 404;
      return next(error);
    }

    const result = await getLatestTfliteModel(type);
    if (!result) return res.status(204).end();

    return res.status(200).json({
      status: 'success',
      message: `Successfully get latest version of ${type} model`,
      data: result,
    });
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
});

router.get('/models/compare', async (req, res, next) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      const error = new Error('Link should has filename query');
      error.statusCode = 422;
      return next(error);
    }

    const fileNameDataSplit = await fileNameResult(filename);
    const latestVersion = (await getLatestTfliteModel(fileNameDataSplit[0])).version;
    const [, currentVersion] = fileNameDataSplit;
    const compare = compareVersion(currentVersion, latestVersion);

    return res.status(200).json({
      status: 'success',
      message: 'Successfully compare tflite model version',
      data: {
        currentVersion,
        latestVersion,
        compare,
      },
    });
  } catch (err) {
    const error = new Error('Internal Server Error');
    next(error);
  }
});

module.exports = router;