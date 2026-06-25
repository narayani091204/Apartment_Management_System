import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import visitorRoutes from './visitor.routes.js';
import noticeRoutes from './notice.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/visitors', visitorRoutes);
router.use('/notices', noticeRoutes);
router.use('/notifications', notificationRoutes);

export default router;
