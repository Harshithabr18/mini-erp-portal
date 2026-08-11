"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // 1. Clean existing data
    await prisma.stockLog.deleteMany();
    await prisma.challan.deleteMany();
    await prisma.customerFollowUp.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    // 2. Create Users with different roles
    const passwordAdmin = bcrypt.hashSync('admin123', 10);
    const passwordSales = bcrypt.hashSync('sales123', 10);
    const passwordWarehouse = bcrypt.hashSync('warehouse123', 10);
    const passwordAccounts = bcrypt.hashSync('accounts123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@erp.com',
            password: passwordAdmin,
            name: 'Aditya Admin',
            role: 'ADMIN',
        },
    });
    const sales = await prisma.user.create({
        data: {
            email: 'sales@erp.com',
            password: passwordSales,
            name: 'Siddharth Sales',
            role: 'SALES',
        },
    });
    const warehouse = await prisma.user.create({
        data: {
            email: 'warehouse@erp.com',
            password: passwordWarehouse,
            name: 'Wasim Warehouse',
            role: 'WAREHOUSE',
        },
    });
    const accounts = await prisma.user.create({
        data: {
            email: 'accounts@erp.com',
            password: passwordAccounts,
            name: 'Aishwarya Accounts',
            role: 'ACCOUNTS',
        },
    });
    console.log('Created Users:', { admin: admin.email, sales: sales.email, warehouse: warehouse.email, accounts: accounts.email });
    // 3. Create Sample Customers
    const customer1 = await prisma.customer.create({
        data: {
            name: 'Acme Distributors',
            mobile: '9876543210',
            email: 'contact@acme.com',
            businessName: 'Acme Corp Pvt Ltd',
            gstNumber: '27AAAAA1111A1Z1',
            customerType: 'DISTRIBUTOR',
            address: '101, Industrial Area Phase II, Mumbai',
            status: 'ACTIVE',
            followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            notes: 'Key distributor for Western region. Always pays on time.',
        },
    });
    const customer2 = await prisma.customer.create({
        data: {
            name: 'Sharma Retail Store',
            mobile: '9123456789',
            email: 'sharmaretails@gmail.com',
            businessName: 'Sharma & Sons Retails',
            gstNumber: '27BBBBB2222B2Z2',
            customerType: 'RETAIL',
            address: 'Shop No. 12, Main Market, Pune',
            status: 'ACTIVE',
            followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            notes: 'Interested in purchasing new stock of wires and switches.',
        },
    });
    const customer3 = await prisma.customer.create({
        data: {
            name: 'Zenith Wholesale Traders',
            mobile: '8888877777',
            email: 'zenithtraders@outlook.com',
            businessName: 'Zenith Trading House',
            customerType: 'WHOLESALE',
            address: 'Plot 45, GIDC Sector 3, Gandhinagar',
            status: 'LEAD',
            followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            notes: 'Initial discussion done. Sent price list for bulk copper rods.',
        },
    });
    console.log('Created Customers: Acme, Sharma, Zenith');
    // 4. Create Follow Ups
    await prisma.customerFollowUp.create({
        data: {
            customerId: customer3.id,
            note: 'Initial call done. Customer wants custom pricing for copper rods.',
            createdBy: 'Siddharth Sales',
        },
    });
    await prisma.customerFollowUp.create({
        data: {
            customerId: customer1.id,
            note: 'Routine monthly check-in. Customer is satisfied with recent order.',
            createdBy: 'Siddharth Sales',
        },
    });
    // 5. Create Sample Products
    const prod1 = await prisma.product.create({
        data: {
            name: 'Copper Wire 1.5 sq mm',
            sku: 'COP-W-1.5',
            category: 'Electricals',
            unitPrice: 1250.00,
            currentStock: 120,
            minStockAlert: 30,
            location: 'Warehouse A - Shelf 3',
        },
    });
    const prod2 = await prisma.product.create({
        data: {
            name: 'LED Panel Light 12W',
            sku: 'LED-PL-12W',
            category: 'Lighting',
            unitPrice: 350.00,
            currentStock: 250,
            minStockAlert: 50,
            location: 'Warehouse A - Shelf 8',
        },
    });
    const prod3 = await prisma.product.create({
        data: {
            name: 'Industrial Copper Rod 10mm',
            sku: 'COP-R-10MM',
            category: 'Metals',
            unitPrice: 4200.00,
            currentStock: 15,
            minStockAlert: 20, // Should trigger warning
            location: 'Warehouse B - Floor Section',
        },
    });
    const prod4 = await prisma.product.create({
        data: {
            name: 'Modular Switch 6A',
            sku: 'MOD-SW-6A',
            category: 'Switches',
            unitPrice: 45.00,
            currentStock: 1200,
            minStockAlert: 200,
            location: 'Warehouse A - Bin 15',
        },
    });
    console.log('Created Products: Copper Wire, LED Light, Copper Rod, Modular Switch');
    // 6. Create Initial Stock Logs for Products
    const initialProducts = [prod1, prod2, prod3, prod4];
    for (const prod of initialProducts) {
        await prisma.stockLog.create({
            data: {
                productId: prod.id,
                quantityChanged: prod.currentStock,
                movementType: 'IN',
                reason: 'Initial stock migration',
                createdBy: 'System Seed',
            },
        });
    }
    console.log('Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
