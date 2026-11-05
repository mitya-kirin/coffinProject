const express = require('express');
const router = express.Router();

// Test route with minimal handlers
try {
  router.put('/test', function(req, res) { res.json({ok: true}); });
  console.log('Route 1 works');
} catch(e) {
  console.log('Route 1 error:', e.message);
}

// Test route with middleware
try {
  const authRequired = (req, res, next) => next();
  router.put('/test2', authRequired, function(req, res) { res.json({ok: true}); });
  console.log('Route 2 works');
} catch(e) {
  console.log('Route 2 error:', e.message);
}

// Test with requireAdmin style
try {
  function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  }
  router.put('/test3', requireAdmin, function(req, res) { res.json({ok: true}); });
  console.log('Route 3 works');
} catch(e) {
  console.log('Route 3 error:', e.message);
}

console.log('Done');
