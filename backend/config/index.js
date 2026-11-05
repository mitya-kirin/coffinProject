module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'ritual-platform-secret-key-2026',
  jwtExpiresIn: '7d',
  uploadDir: require('path').join(__dirname, '..', 'uploads')
};
