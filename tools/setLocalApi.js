const os = require('os');
const fs = require('fs');
const path = require('path');

const interfaces = os.networkInterfaces();
let localIp = null;
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIp = iface.address;
      break;
    }
  }
  if (localIp) break;
}

if (!localIp) {
  console.error('Could not detect local IP address.');
  process.exit(1);
}

const appJsonPath = path.resolve(__dirname, '..', 'mobile', 'app.json');
const raw = fs.readFileSync(appJsonPath, 'utf8');
let json = JSON.parse(raw);
if (!json.expo) json = { expo: json };
json.expo.extra = json.expo.extra || {};
json.expo.extra.apiUrl = `http://${localIp}:5000`;
fs.writeFileSync(appJsonPath, JSON.stringify(json, null, 2), 'utf8');
console.log('Updated mobile/app.json extra.apiUrl to', json.expo.extra.apiUrl);
process.exit(0);
