import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Ensure DNS is set before Cloudinary connection
try {
  const currentDns = dns.getServers();
  console.log('🔍 Cloudinary config - Current DNS:', currentDns);

  if (currentDns.length === 0 || currentDns[0] === '127.0.0.1') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('✅ Cloudinary config - DNS updated to:', dns.getServers());
  }
} catch (err) {
  console.warn('Cloudinary config - DNS check skipped:', err.message);
}

// Test DNS resolution
console.log('🔍 Testing Cloudinary DNS resolution...');
dns.lookup('api.cloudinary.com', (err, address) => {
  if (err) {
    console.error('❌ Cloudinary DNS resolution FAILED:', err.message);
    console.error('💡 This is a NETWORK issue. Please:');
    console.error('   1. Run: ipconfig /flushdns');
    console.error('   2. Check your internet connection');
    console.error('   3. Disable VPN if using one');
  } else {
    console.log('✅ Cloudinary DNS resolved to:', address);
  }
});

// Validate environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('❌ CLOUDINARY_CLOUD_NAME is missing in .env file');
}
if (!process.env.CLOUDINARY_API_KEY) {
  console.error('❌ CLOUDINARY_API_KEY is missing in .env file');
}
if (!process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ CLOUDINARY_API_SECRET is missing in .env file');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000,
  connection_timeout: 30000,
  keep_alive: true,
});

console.log('✅ Cloudinary configured');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log(
  'API Key:',
  process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
);
console.log(
  'API Secret:',
  process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
);

export default cloudinary;
