import cloudinary from '../config/cloudinary.js';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export const checkCloudinaryStatus = async (req, res) => {
  try {
    // Check DNS resolution first
    let dnsOk = false;
    try {
      await dnsLookup('api.cloudinary.com');
      dnsOk = true;
      console.log('✅ DNS resolution for api.cloudinary.com successful');
    } catch (dnsError) {
      console.error('❌ DNS resolution failed:', dnsError.message);
    }

    // Try to ping Cloudinary
    try {
      const result = await cloudinary.api.ping();
      res.json({
        success: true,
        connected: true,
        dnsResolves: dnsOk,
        message: 'Cloudinary connection OK',
        result,
      });
    } catch (cloudinaryError) {
      res.status(503).json({
        success: false,
        connected: false,
        dnsResolves: dnsOk,
        message: 'Cannot connect to Cloudinary API',
        error: cloudinaryError.message,
      });
    }
  } catch (error) {
    console.error('Cloudinary status check failed:', error.message);
    res.status(503).json({
      success: false,
      connected: false,
      message: 'Cannot connect to Cloudinary',
      error: error.message,
    });
  }
};

export const testNetwork = async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  // Check localhost
  try {
    await dnsLookup('localhost');
    results.checks.push({ name: 'localhost', status: 'OK' });
  } catch (err) {
    results.checks.push({
      name: 'localhost',
      status: 'FAILED',
      error: err.message,
    });
  }

  // Check Cloudinary
  try {
    await dnsLookup('api.cloudinary.com');
    results.checks.push({ name: 'api.cloudinary.com', status: 'OK' });
  } catch (err) {
    results.checks.push({
      name: 'api.cloudinary.com',
      status: 'FAILED',
      error: err.message,
    });
  }

  // Check Google DNS (to verify internet connectivity)
  try {
    await dnsLookup('8.8.8.8');
    results.checks.push({ name: 'Google DNS (8.8.8.8)', status: 'OK' });
  } catch (err) {
    results.checks.push({
      name: 'Google DNS (8.8.8.8)',
      status: 'FAILED',
      error: err.message,
    });
  }

  res.json(results);
};
