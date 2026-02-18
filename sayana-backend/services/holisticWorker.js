const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const HOLISTIC_SCRIPT_PATH = path.join(__dirname, '..', 'python', 'holistic_bridge.py');
const PYTHON_BIN = process.env.SIGN_PYTHON_BIN || process.env.PYTHON_BIN || 'python';
const HOLISTIC_TIMEOUT_MS = Number(process.env.HOLISTIC_TIMEOUT_MS || 15000);
const WORKER_DISABLED = process.env.HOLISTIC_DISABLE_WORKER === '1';

class HolisticWorker {
  constructor() {
    this.queue = [];
    this.currentJob = null;
    this.exited = false;

    const env = { ...process.env, HOLISTIC_SERVER: '1' };
    this.child = spawn(PYTHON_BIN, [HOLISTIC_SCRIPT_PATH], { env });

    this.readline = readline.createInterface({ input: this.child.stdout });
    this.readline.on('line', (line) => this.handleLine(line));

    this.child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.trim()) {
        console.warn('[HolisticWorker] stderr:', text.trim());
      }
    });

    this.child.on('exit', (code, signal) => {
      this.exited = true;
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.warn(`[HolisticWorker] exited with ${reason}`);
      this.flushPending(new Error('Holistic worker exited'));
    });
  }

  enqueue(imageBase64) {
    if (this.exited || !this.child || WORKER_DISABLED) {
      return runHolisticOnce(imageBase64);
    }

    return new Promise((resolve, reject) => {
      const job = { imageBase64, resolve, reject, timer: null };
      this.queue.push(job);
      this.drain();
    });
  }

  drain() {
    if (this.currentJob || !this.queue.length) return;
    if (!this.child || this.exited) {
      const error = new Error('Holistic worker unavailable');
      this.flushPending(error);
      return;
    }

    const job = this.queue.shift();
    this.currentJob = job;
    job.timer = setTimeout(() => {
      job.reject(new Error('Holistic worker timeout'));
      this.currentJob = null;
      this.drain();
    }, HOLISTIC_TIMEOUT_MS);

    try {
      this.child.stdin.write(`${JSON.stringify({ image_base64: job.imageBase64 })}\n`);
    } catch (err) {
      clearTimeout(job.timer);
      this.currentJob = null;
      job.reject(err);
      this.shutdown();
    }
  }

  handleLine(line) {
    const payload = line.trim();
    if (!payload) return;
    if (!this.currentJob) return;

    const job = this.currentJob;
    clearTimeout(job.timer);
    this.currentJob = null;

    let data;
    try {
      data = JSON.parse(payload);
    } catch (err) {
      job.reject(new Error('Holistic worker returned invalid JSON'));
      this.drain();
      return;
    }

    if (data && data.error) {
      job.reject(new Error(data.error));
    } else {
      job.resolve(data);
    }

    this.drain();
  }

  flushPending(error) {
    if (this.currentJob) {
      clearTimeout(this.currentJob.timer);
      this.currentJob.reject(error);
      this.currentJob = null;
    }
    while (this.queue.length) {
      const job = this.queue.shift();
      job.reject(error);
    }
  }

  shutdown() {
    this.flushPending(new Error('Holistic worker shut down'));
    if (this.child && !this.exited) {
      this.child.kill('SIGTERM');
    }
    this.exited = true;
    this.child = null;
  }
}

function runHolisticOnce(imageBase64) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [HOLISTIC_SCRIPT_PATH]);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Holistic extractor timed out (legacy)'));
    }, HOLISTIC_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || `Holistic exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (err) {
        reject(new Error(`Failed to parse holistic output: ${err.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ image_base64: imageBase64 }));
    child.stdin.end();
  });
}

let singleton = null;

function getWorker() {
  if (WORKER_DISABLED) {
    return null;
  }
  if (singleton && singleton.exited) {
    singleton = null;
  }
  if (!singleton) {
    singleton = new HolisticWorker();
  }
  return singleton;
}

async function getHolisticLandmarks(imageBuffer) {
  if (!imageBuffer?.length) return null;
  const base64 = imageBuffer.toString('base64');
  const worker = getWorker();
  if (worker) {
    try {
      return await worker.enqueue(base64);
    } catch (err) {
      console.warn('[HolisticWorker] falling back to legacy mode:', err.message || err);
    }
  }
  return runHolisticOnce(base64);
}

function resetHolisticWorker() {
  if (singleton) {
    singleton.shutdown();
    singleton = null;
  }
}

module.exports = {
  getHolisticLandmarks,
  resetHolisticWorker,
};
