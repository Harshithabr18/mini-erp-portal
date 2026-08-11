import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation schema for creating/updating a challan
const challanProductItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const challanSchema = z.object({
  customerId: z.string(),
  products: z.array(challanProductItemSchema).min(1, 'At least one product is required'),
  status: z.enum(['DRAFT', 'CONFIRMED']),
});

// GET /api/challans - List all challans with filters
// Allowed roles: ADMIN, SALES, ACCOUNTS
router.get('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as string;
      const customerId = req.query.customerId as string;

      const where: any = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      // Sales user can only see challans (or we can let them see all for general context, let's let them see all, or filter by creator if needed)
      const challans = await prisma.challan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true, businessName: true }
          }
        }
      });

      return res.json(challans);
    } catch (error) {
      console.error('Fetch challans error:', error);
      return res.status(500).json({ error: 'Failed to fetch challans' });
    }
  }
);

// GET /api/challans/:id - Fetch single challan
// Allowed roles: ADMIN, SALES, ACCOUNTS
router.get('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const challan = await prisma.challan.findUnique({
        where: { id },
        include: {
          customer: true
        }
      });

      if (!challan) {
        return res.status(404).json({ error: 'Challan not found' });
      }

      return res.json(challan);
    } catch (error) {
      console.error('Fetch challan error:', error);
      return res.status(500).json({ error: 'Failed to fetch challan' });
    }
  }
);

// POST /api/challans - Create a challan (Draft or Confirmed)
// Allowed roles: ADMIN, SALES
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = challanSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const { customerId, products, status } = parseResult.data;
      const username = req.user?.name || req.user?.email || 'System';

      // 1. Verify customer exists
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // 2. Fetch all products to create snapshot and check stocks
      const productIds = products.map((p) => p.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });

      if (dbProducts.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more selected products do not exist' });
      }

      // Map dbProducts by id for fast lookup
      const dbProductsMap = new Map(dbProducts.map((p) => [p.id, p]));

      // 3. Prepare product snapshot array and validate stock if status is CONFIRMED
      const snapshot: Array<{ productId: string; name: string; sku: string; unitPrice: number; quantity: number }> = [];
      let totalQty = 0;

      for (const reqProd of products) {
        const dbProd = dbProductsMap.get(reqProd.productId)!;
        
        if (status === 'CONFIRMED') {
          if (dbProd.currentStock < reqProd.quantity) {
            return res.status(400).json({ 
              error: `Insufficient stock for product: ${dbProd.name}. Available: ${dbProd.currentStock}, Requested: ${reqProd.quantity}` 
            });
          }
        }

        snapshot.push({
          productId: dbProd.id,
          name: dbProd.name,
          sku: dbProd.sku,
          unitPrice: dbProd.unitPrice,
          quantity: reqProd.quantity
        });
        totalQty += reqProd.quantity;
      }

      // 4. Generate Challan Number: CH-YYYYMMDD-XXXX
      const today = new Date();
      const datePart = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      const challanNumber = `CH-${datePart}-${randomPart}`;

      // 5. Run transactional creation
      const createdChallan = await prisma.$transaction(async (tx) => {
        // If confirmed, update stock values and create stock logs
        if (status === 'CONFIRMED') {
          for (const reqProd of products) {
            const dbProd = dbProductsMap.get(reqProd.productId)!;
            const updatedStock = dbProd.currentStock - reqProd.quantity;

            // Deduct product stock
            await tx.product.update({
              where: { id: dbProd.id },
              data: { currentStock: updatedStock }
            });

            // Log stock movement
            await tx.stockLog.create({
              data: {
                productId: dbProd.id,
                quantityChanged: reqProd.quantity,
                movementType: 'OUT',
                reason: `Sales Challan ${challanNumber} Confirmed`,
                createdBy: username
              }
            });
          }
        }

        // Create the Challan
        return await tx.challan.create({
          data: {
            challanNumber,
            customerId,
            status,
            totalQuantity: totalQty,
            createdBy: username,
            productsSnapshot: JSON.stringify(snapshot)
          }
        });
      });

      return res.status(201).json(createdChallan);
    } catch (error) {
      console.error('Create challan error:', error);
      return res.status(500).json({ error: 'Failed to create challan' });
    }
  }
);

// PUT /api/challans/:id/status - Update Challan Status (Confirm or Cancel)
// Allowed roles: ADMIN, ACCOUNTS, SALES
router.put('/:id/status', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'ACCOUNTS', 'SALES']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(['CONFIRMED', 'CANCELLED']),
      });

      const parseResult = statusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid status value', details: parseResult.error.format() });
      }

      const newStatus = parseResult.data.status;
      const username = req.user?.name || req.user?.email || 'System';

      // 1. Fetch existing challan
      const challan = await prisma.challan.findUnique({ where: { id } });
      if (!challan) {
        return res.status(404).json({ error: 'Challan not found' });
      }

      if (challan.status === newStatus) {
        return res.status(400).json({ error: `Challan is already in ${newStatus} status` });
      }

      if (challan.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot update status of a cancelled challan' });
      }

      const products: Array<{ productId: string; name: string; sku: string; unitPrice: number; quantity: number }> = 
        JSON.parse(challan.productsSnapshot);

      const productIds = products.map((p) => p.productId);

      // 2. Perform operations inside database transaction
      const updatedChallan = await prisma.$transaction(async (tx) => {
        
        // Transition: DRAFT -> CONFIRMED
        if (challan.status === 'DRAFT' && newStatus === 'CONFIRMED') {
          // Fetch current products stock levels
          const dbProducts = await tx.product.findMany({
            where: { id: { in: productIds } }
          });
          const dbProductsMap = new Map(dbProducts.map((p) => [p.id, p]));

          // Validate stock for all products first
          for (const item of products) {
            const dbProd = dbProductsMap.get(item.productId);
            if (!dbProd) {
              throw new Error(`Product ${item.name} not found in inventory anymore`);
            }
            if (dbProd.currentStock < item.quantity) {
              throw new Error(`Insufficient stock for product: ${dbProd.name}. Available: ${dbProd.currentStock}, Requested: ${item.quantity}`);
            }
          }

          // Update stock and write logs
          for (const item of products) {
            const dbProd = dbProductsMap.get(item.productId)!;
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: dbProd.currentStock - item.quantity }
            });

            await tx.stockLog.create({
              data: {
                productId: item.productId,
                quantityChanged: item.quantity,
                movementType: 'OUT',
                reason: `Sales Challan ${challan.challanNumber} Confirmed`,
                createdBy: username
              }
            });
          }
        }

        // Transition: CONFIRMED -> CANCELLED
        if (challan.status === 'CONFIRMED' && newStatus === 'CANCELLED') {
          // Add back stock to inventory and write logs
          for (const item of products) {
            const dbProd = await tx.product.findUnique({ where: { id: item.productId } });
            if (dbProd) {
              await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: dbProd.currentStock + item.quantity }
              });

              await tx.stockLog.create({
                data: {
                  productId: item.productId,
                  quantityChanged: item.quantity,
                  movementType: 'IN',
                  reason: `Sales Challan ${challan.challanNumber} Cancelled - Stock Restored`,
                  createdBy: username
                }
              });
            }
          }
        }

        // Return updated challan
        return await tx.challan.update({
          where: { id },
          data: { status: newStatus }
        });
      });

      return res.json(updatedChallan);
    } catch (error: any) {
      console.error('Update challan status error:', error);
      return res.status(400).json({ error: error.message || 'Failed to update challan status' });
    }
  }
);

export default router;
