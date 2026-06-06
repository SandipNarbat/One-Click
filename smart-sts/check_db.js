const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const sales = await p.sale.findMany({
    include: { customer: true, salesPerson: true }
  });
  console.log('=== SALES TABLE ===');
  console.log('Total records:', sales.length);
  if (sales.length > 0) {
    console.log(JSON.stringify(sales, null, 2));
  } else {
    console.log('(empty - no sale records exist)');
  }

  console.log('\n=== SALES TABLE COLUMNS (from schema) ===');
  console.log('id, invoiceNo, invoiceDate, customerId, salesPersonId, itemId, productName, model, brand, quantity, amount, createdAt');

  await p.$disconnect();
}

main();
