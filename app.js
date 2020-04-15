const express = require('express');
const logger = require('morgan');
const helmet = require('helmet');
const YAML = require('yamljs');
const cors = require('cors');
const app = express();

const swaggerUI = require('swagger-ui-express');
const swaggerDocument = YAML.load('./configs/swagger.yaml');
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
};

const PORT = process.env.PORT || 5015;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(logger(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (NODE_ENV !== 'production') {
  require('longjohn').async_trace_limit = -1;
  Error.stackTraceLimit = Infinity;
  app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument, swaggerOptions));
}

app.use('/api', require('./modules/dataset'));
app.use('/api', require('./modules/tflite'));

// Error Handlers
app.use('*', (req, res, next) => {
  const error = new Error('Not Found - ' + req.originalUrl);
  error.statusCode = 404;
  next(error);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message,
  });
});

// Listening
app.listen(PORT, () => console.log('Server is running..'));
