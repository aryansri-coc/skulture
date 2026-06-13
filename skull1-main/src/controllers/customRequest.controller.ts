import { Request, Response, NextFunction } from 'express';
import { CustomRequestService } from '../services/customRequest.service';
import MESSAGES from '../constants/messages';
import { Role } from '@prisma/client';

const customRequestService = new CustomRequestService();

export class CustomRequestController {
  async getCustomRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const requests = await customRequestService.getCustomRequests(userId);
      res.status(200).json({
        success: true,
        message: 'Custom requests retrieved successfully',
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      const request = await customRequestService.getCustomRequestById(userId, id, isAdmin);
      res.status(200).json({
        success: true,
        message: 'Custom request details retrieved',
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCustomRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const request = await customRequestService.createCustomRequest(userId, req.body);
      res.status(201).json({
        success: true,
        message: MESSAGES.CUSTOM_REQUEST.CREATED,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCustomRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      const request = await customRequestService.updateCustomRequest(userId, id, req.body, isAdmin);
      res.status(200).json({
        success: true,
        message: 'Custom request updated successfully',
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      await customRequestService.deleteCustomRequest(userId, id, isAdmin);
      res.status(200).json({
        success: true,
        message: 'Custom request deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // File uploads
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id;
      const { url, fileType } = req.body;
      const file = await customRequestService.uploadRequestFile(userId, id, url, fileType);
      res.status(201).json({
        success: true,
        message: MESSAGES.CUSTOM_REQUEST.FILE_UPLOADED,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const fileId = req.params.fileId;
      const isAdmin = req.user!.role === Role.ADMIN;
      await customRequestService.deleteRequestFile(userId, fileId, isAdmin);
      res.status(200).json({
        success: true,
        message: 'Request file deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCustomRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await customRequestService.getAllCustomRequests(page, limit);
      res.status(200).json({
        success: true,
        message: 'All custom requests retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async convertToOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const order = await customRequestService.convertToOrder(id);
      res.status(200).json({
        success: true,
        message: 'Custom request successfully converted to an Order',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CustomRequestController;
