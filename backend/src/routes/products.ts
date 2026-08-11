import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Zod schemas for input validation
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  currentStock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockAlert: z.number().int().min(0, 'Min stock alert must be positive').default(10),
  location: z.string().min(1, 'Warehouse location is required'),
});

const adjustStockSchema = z.object({
  quantityChanged: z.number().int().min(1, 'Quantity must be at least 1'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'Reason is required'),
});

// GET /api/products/logs - Fetch all stock logs
// Allowed roles: ADMIN, WAREHOUSE
router.get('/logs', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await prisma.stockLog.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { name: true, sku: true }
          }
        }
      });
      return res.json(logs);
    } catch (error) {
      console.error('Fetch stock logs error:', error);
      return res.status(500).json({ error: 'Failed to fetch stock logs' });
    }
  }
);

// GET /api/products - List products (with search & filters)
// Allowed roles: ADMIN, WAREHOUSE, SALES, ACCOUNTS
router.get('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = req.query.search as string;
      const category = req.query.category as string;
      const alert = req.query.alert as string; // 'low' to filter products below minimum stock

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { sku: { contains: search } }
        ];
      }

      let products = await prisma.product.findMany({
        where,
        orderBy: { sku: 'asc' }
      });

      // Filter low stock if requested (Prisma SQLite does not support comparing columns directly in where, so we can do it in memory or query)
      if (alert === 'low') {
        products = products.filter(p => p.currentStock <= p.minStockAlert);
      }

      return res.json(products);
    } catch (error) {
      console.error('Fetch products error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
);

// GET /api/products/:id - Fetch single product
// Allowed roles: ADMIN, WAREHOUSE, SALES, ACCOUNTS
router.get('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          stockLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.json(product);
    } catch (error) {
      console.error('Fetch product detail error:', error);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
  }
);

// POST /api/products - Create a new product
// Allowed roles: ADMIN, WAREHOUSE
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = productSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      // Check if SKU unique
      const existingSku = await prisma.product.findUnique({
        where: { sku: parseResult.data.sku }
      });

      if (existingSku) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }

      // Create product
      const newProduct = await prisma.product.create({
        data: parseResult.data
      });

      // Write initial stock movement log
      await prisma.stockLog.create({
        data: {
          productId: newProduct.id,
          quantityChanged: newProduct.currentStock,
          movementType: 'IN',
          reason: 'Initial product stock creation',
          createdBy: req.user?.name || req.user?.email || 'System'
        }
      });

      return res.status(201).json(newProduct);
    } catch (error) {
      console.error('Create product error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// PUT /api/products/:id - Edit product details (except stock value directly)
// Allowed roles: ADMIN, WAREHOUSE
router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = productSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // If SKU is changing, verify it is unique
      if (parseResult.data.sku && parseResult.data.sku !== existingProduct.sku) {
        const skuInUse = await prisma.product.findUnique({
          where: { sku: parseResult.data.sku }
        });
        if (skuInUse) {
          return res.status(400).json({ error: 'Product SKU is already in use by another product' });
        }
      }

      // Remove currentStock from direct updates to ensure all stock modifications go through logging
      const { currentStock, ...updateData } = parseResult.data;

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData
      });

      return res.json(updatedProduct);
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// POST /api/products/:id/adjust-stock - Adjust stock level manually
// Allowed roles: ADMIN, WAREHOUSE
router.post('/:id/adjust-stock', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'WAREHOUSE']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = adjustStockSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const { quantityChanged, movementType, reason } = parseResult.data;

      // Find product
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate new stock
      let newStock = product.currentStock;
      if (movementType === 'IN') {
        newStock += quantityChanged;
      } else {
        newStock -= quantityChanged;
        if (newStock < 0) {
          return res.status(400).json({ error: 'Adjustment fails: current stock cannot fall below zero' });
        }
      }

      // Run transactional update
      const updatedProduct = await prisma.$transaction(async (tx) => {
        // Update product stock
        const updated = await tx.product.update({
          where: { id },
          data: { currentStock: newStock }
        });

        // Add Log
        await tx.stockLog.create({
          data: {
            productId: id,
            quantityChanged,
            movementType,
            reason,
            createdBy: req.user?.name || req.user?.email || 'System'
          }
        });

        return updated;
      });

      return res.json(updatedProduct);
    } catch (error) {
      console.error('Stock adjustment error:', error);
      return res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }
);

export default router;
