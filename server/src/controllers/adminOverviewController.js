const { Payment, Invoice } = require('../database/models');
const { PAYMENT_STATUS, INVOICE_STATUS } = require('../billing/enums');

/**
 * GET /api/admin/overview — pending payments + overdue invoice counts.
 */
async function getOverview(req, res, next) {
  try {
    const [pendingPayments, overdueInvoices] = await Promise.all([
      Payment.countDocuments({ status: PAYMENT_STATUS.PENDING }),
      Invoice.countDocuments({ status: INVOICE_STATUS.OVERDUE }),
    ]);

    res.json({
      success: true,
      data: {
        pendingPayments,
        overdueInvoices,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };
