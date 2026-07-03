const fs = require('fs');
const auth = require('firebase/auth');
console.log('Keys in firebase/auth:', Object.keys(auth).join(', '));
try {
  const authRN = require('firebase/auth/react-native');
  console.log('Keys in firebase/auth/react-native:', Object.keys(authRN).join(', '));
} catch(e) {
  console.log('No firebase/auth/react-native');
}
try {
  const authDist = require('@firebase/auth');
  console.log('Keys in @firebase/auth:', Object.keys(authDist).join(', '));
} catch(e) {
  console.log('No @firebase/auth');
}
