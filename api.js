const cors = require('cors');
const express = require('express');
const { v4: uuid } = require('uuid');

const config = require('./config')
const { Storage } = require('./storage');

///////////////////
// General setup

const API_KEY_HEADER = 'X-Api-Key';
const STATUSES = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
};
const MAX_OTP_ATTEMPTS = 3;

const apiKeys = new Set(config.apiKeys || []);
const newSessionIds = new Set(config.newSessionIds || []);
const storage = new Storage(config.storage);
storage.seed((config.newSessionIds || []).map(createSession));
const otpSuccessCodes = new Set((config.otp || {}).successCodes.map(x => x.toString()) || []);
const defaultProcessingDelaySeconds = Math.max(0, (config.processing || {}).delaySeconds || 0);
const scenarios = (config.scenarios || []).reduce((result, item) => {
  if (item.email) {
    item.otp = item.otp ? item.otp.toString() : null;
    result[item.email] = item;
  }
  return result;
}, {});

///////////////////
// Configure express server -->
const app = express();
const port = 8989;
app.use(cors());
app.use(express.json());
app.use(log);

///////////////////
// Configure express routes -->

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.get('/config.json', (req, res) => {
  res.sendFile('config.json', { root: __dirname });
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile('favicon.ico', { root: __dirname });
});

app.post('/session', auth, (req, res) => {
  const id = uuid();
  const session = createSession(id);

  storage.save(session);

  res.json(withDebugInfo({ id }, { session }));
});

app.put('/session/:id', async (req, res) => {
  const session = storage.get(req.params.id);
  if (!session) {
    return res.status(404).send();
  }

  const { firstName, lastName, email, companyUrl } = req.body;
  const newProps = { firstName, lastName, email, companyUrl };

  if (!(firstName && lastName && isValidEmail(email) && isValidUrl(companyUrl))) {
    return res.status(400).send();
  }

  let isChanged = false;
  for (let prop in newProps) {
    if (session[prop] == null) {
      session[prop] = newProps[prop];
      isChanged = true;
    }
  }

  // Always reset pre-populated session ids to allow re-use.
  // This is a minor difference from the real API but makes testing easier.
  if (newSessionIds.has(session.id)) {
    isChanged = true;
    session.status = STATUSES.pending;
    session.score = 0;
    session.otpVerified = false;
    session.otpAttempts = 0;
  }

  if (isChanged) {
    session.updated = new Date();
    storage.save(session);
  }

  res.status(204).send();
});

app.patch('/session/:id/verify', async (req, res) => {
  const session = storage.get(req.params.id);
  if (!session) {
    return res.status(404).send();
  }

  const { otp } = req.body
  if (!otp) {
    return res.status(400).send();
  }

  const scenario = scenarios[session.email] || {};

  session.otpAttempts = (session.otpAttempts || 0) + 1;
  if ((session.status != STATUSES.pending && session.status != STATUSES.failed) || session.otpAttempts > MAX_OTP_ATTEMPTS) {
    res.json(withDebugInfo({ success: false, canRetry: false }, { session }));
    return;
  }

  session.otpVerified = scenario.otp ? scenario.otp === otp : otpSuccessCodes.has(otp);
  session.status = session.otpVerified ? STATUSES.processing : STATUSES.failed;
  session.updated = new Date();
  session.score = 0;
  storage.save(session);

  if (session.otpVerified) {
    // Simulate processing by setting score and completed status some time later.
    const delaySeconds = scenario.processingDelaySeconds != null
      ? scenario.processingDelaySeconds
      : defaultProcessingDelaySeconds;
    setTimeout(() => {
      session.status = STATUSES.completed;
      session.score = scenario.score || 0;
      session.updated = new Date();
      storage.save(session);
    }, Math.max(0, delaySeconds) * 1000);

    res.json(withDebugInfo({ success: true, canRetry: false }, { session }));
    return;
  }

  res.json(withDebugInfo({ success: false, canRetry: session.otpAttempts < MAX_OTP_ATTEMPTS }, { session }));
});

app.get('/session/:id', auth, (req, res) => {
  const session = storage.get(req.params.id);
  if (!session) {
    return res.status(404).send();
  }

  res.json(withDebugInfo({
    id: session.id,
    status: session.status,
    score: session.score,
  }, { session }));
});

///////////////////
// Start up server -->
app.listen(port, () => console.debug(`Mock Verify API is ready at: http://localhost:${port}`));

//////////////////
// Helpers

function createSession(id) {
  return {
    id,
    status: STATUSES.pending,
    score: null,
    otpVerified: false,
    created: new Date(),
    updated: new Date()
  };
}

function auth(req, res, next) {
  if (apiKeys.has(req.header(API_KEY_HEADER))) {
    next();
    return;
  }

  res.status(403).json({ message: 'Forbidden' });
}

function log(req, res, next) {
  console.log(`Request: ${req.method} ${req.originalUrl}`);
  res.on('finish', () => console.log(`Response: ${res.statusCode}`));
  next();
}

function isValidEmail(email) {
  return email && /^[^@\s]+@[^@.\s]+?\.[^@\s]+$/.test(email);
}

function isValidUrl(url) {
  return url && (url.indexOf('http:') > -1 || url.indexOf('https:') > -1);
}

function withDebugInfo(data, debugInfo) {
  return {
    ...data,
    __mock_debug__: {
      __note__: `The mock api provides this data for debugging. It does not exist in the real api.`,
      ...debugInfo
    }
  };
}
