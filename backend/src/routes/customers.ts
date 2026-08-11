import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Zod schemas for input validation
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  notes: z.string().optional().nullable(),
});

const followUpSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty'),
});

// GET /api/customers - List customers with search, pagination, filter
// Allowed roles: ADMIN, SALES, ACCOUNTS
router.get('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const type = req.query.type as string;
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Construct where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }
      if (type) {
        where.customerType = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { businessName: { contains: search } },
          { mobile: { contains: search } }
        ];
      }

      // Query database
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { followUps: true }
            }
          }
        }),
        prisma.customer.count({ where })
      ]);

      return res.json({
        customers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Fetch customers error:', error);
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }
);

// GET /api/customers/:id - View details and follow-ups
// Allowed roles: ADMIN, SALES, ACCOUNTS
router.get('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES', 'ACCOUNTS']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          followUps: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.json(customer);
    } catch (error) {
      console.error('Fetch customer detail error:', error);
      return res.status(500).json({ error: 'Failed to fetch customer details' });
    }
  }
);

// POST /api/customers - Add customer
// Allowed roles: ADMIN, SALES
router.post('/', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = customerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const newCustomer = await prisma.customer.create({
        data: parseResult.data,
      });

      // Log initial follow-up note
      await prisma.customerFollowUp.create({
        data: {
          customerId: newCustomer.id,
          note: `Customer profile created. Type: ${newCustomer.customerType}, Status: ${newCustomer.status}.`,
          createdBy: req.user?.name || req.user?.email || 'System',
        }
      });

      return res.status(201).json(newCustomer);
    } catch (error) {
      console.error('Create customer error:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

// PUT /api/customers/:id - Edit customer
// Allowed roles: ADMIN, SALES
router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = customerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const existingCustomer = await prisma.customer.findUnique({ where: { id } });
      if (!existingCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if status changed to log it
      const statusChanged = existingCustomer.status !== parseResult.data.status;

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: parseResult.data,
      });

      if (statusChanged) {
        await prisma.customerFollowUp.create({
          data: {
            customerId: updatedCustomer.id,
            note: `Status updated from ${existingCustomer.status} to ${updatedCustomer.status}.`,
            createdBy: req.user?.name || req.user?.email || 'System',
          }
        });
      }

      return res.json(updatedCustomer);
    } catch (error) {
      console.error('Update customer error:', error);
      return res.status(500).json({ error: 'Failed to update customer' });
    }
  }
);

// POST /api/customers/:id/followups - Add follow-up note
// Allowed roles: ADMIN, SALES
router.post('/:id/followups', 
  authMiddleware, 
  roleMiddleware(['ADMIN', 'SALES']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = followUpSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      }

      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const followUp = await prisma.customerFollowUp.create({
        data: {
          customerId: id,
          note: parseResult.data.note,
          createdBy: req.user?.name || req.user?.email || 'System',
        }
      });

      return res.status(201).json(followUp);
    } catch (error) {
      console.error('Create follow-up error:', error);
      return res.status(500).json({ error: 'Failed to add follow-up note' });
    }
  }
);

export default router;
