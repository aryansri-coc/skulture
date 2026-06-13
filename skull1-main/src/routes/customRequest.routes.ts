import { Router } from 'express';
import { CustomRequestController } from '../controllers/customRequest.controller';
import { protect } from '../middlewares/auth.middleware';
import { restrictToAdmin } from '../middlewares/admin.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCustomRequestSchema, updateCustomRequestSchema } from '../validators/customRequest.validator';

const router = Router();
const controller = new CustomRequestController();

router.use(protect); // All custom requests require auth

// 1. Customer Custom Requests (/api/custom-requests)
router.post('/', validate(createCustomRequestSchema), controller.createCustomRequest);
router.get('/', controller.getCustomRequests);
router.get('/:id', controller.getCustomRequestById);
router.patch('/:id', validate(updateCustomRequestSchema), controller.updateCustomRequest);
router.delete('/:id', controller.deleteCustomRequest);

// 2. Custom Request File Routes (/api/custom-requests)
router.post('/:id/files', controller.uploadFile);
router.delete('/files/:fileId', controller.deleteFile);

// 3. Admin Custom Request Routes (Mounted at /api/admin/custom-requests)
export const adminCustomRequestRouter = Router();
adminCustomRequestRouter.use(protect, restrictToAdmin);
adminCustomRequestRouter.get('/', controller.getAllCustomRequests);
adminCustomRequestRouter.get('/:id', controller.getCustomRequestById);
adminCustomRequestRouter.patch('/:id', validate(updateCustomRequestSchema), controller.updateCustomRequest);
adminCustomRequestRouter.post('/:id/convert-to-order', controller.convertToOrder);
adminCustomRequestRouter.delete('/:id', controller.deleteCustomRequest);

export default router;
