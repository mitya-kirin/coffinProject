const express = require('express');
const router = express.Router();
const controller = require('../controllers/cemetery.controller');
const { authRequired, requireAdmin, requireRole } = require('../middleware/auth.middleware');

// Burials search - only for authenticated users
router.get('/burials/search', authRequired, controller.searchBurials);
router.get('/burials', controller.listBurials);
router.post('/burials', authRequired, requireRole('admin', 'agent'), controller.createBurial);
router.put('/burials/:id', authRequired, requireRole('admin', 'agent'), controller.updateBurial);
router.delete('/burials/:id', authRequired, requireAdmin, controller.deleteBurial);

// Cemeteries (view public, manage admin+agent)
router.get('/cemeteries', controller.listCemeteries);
router.get('/cemeteries/:id', controller.getCemetery);
router.post('/cemeteries', authRequired, requireRole('admin', 'agent'), controller.createCemetery);
router.put('/cemeteries/:id', authRequired, requireRole('admin', 'agent'), controller.updateCemetery);
router.delete('/cemeteries/:id', authRequired, requireAdmin, controller.deleteCemetery);

// Sections
router.get('/sections', controller.listSections);
router.post('/sections', authRequired, requireRole('admin', 'agent'), controller.createSection);
router.put('/sections/:id', authRequired, requireRole('admin', 'agent'), controller.updateSection);
router.delete('/sections/:id', authRequired, requireAdmin, controller.deleteSection);

// Burial places (обработчик подтверждает бронь/статус места)
router.get('/burial-places', controller.listBurialPlaces);
router.get('/burial-places/:id', controller.getBurialPlace);
router.post('/burial-places', authRequired, requireRole('admin', 'agent'), controller.createBurialPlace);
router.put('/burial-places/:id', authRequired, requireRole('admin', 'agent'), controller.updateBurialPlace);

module.exports = router;
