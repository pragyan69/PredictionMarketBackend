// src/modules/unified/orders.routes.ts

import { Router } from 'express';
import { unifiedOrdersController } from './orders.controller';
import { requireAuth } from '../auth/auth.middleware';

export const unifiedOrdersRouter = Router();

// All routes require authentication
unifiedOrdersRouter.use(requireAuth);

// Create order (routes to appropriate platform)
unifiedOrdersRouter.post('/', (req, res) => unifiedOrdersController.createOrder(req, res));

// Get all orders
unifiedOrdersRouter.get('/', (req, res) => unifiedOrdersController.getOrders(req, res));

// Get single order
unifiedOrdersRouter.get('/:id', (req, res) => unifiedOrdersController.getOrder(req, res));

// Cancel single order
unifiedOrdersRouter.delete('/:id', (req, res) => unifiedOrdersController.cancelOrder(req, res));

// Cancel multiple orders
unifiedOrdersRouter.delete('/', (req, res) => unifiedOrdersController.cancelOrders(req, res));
