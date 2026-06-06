import express from 'express';
import PdfPrinter from 'pdfmake';
import nodemailer from 'nodemailer';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Invoice from '../models/Invoice.js';
import Approval from '../models/Approval.js';
import Quotation from '../models/Quotation.js';
import RFQ from '../models/RFQ.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// Define pdfmake core fonts (standard PDF fonts do not require downloading external ttf files)
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};
const printer = new PdfPrinter(fonts);

// @desc    Create a Purchase Order from Approval ID
// @route   POST /api/po
// @access  Private (Procurement Officer)
router.post('/po', protect, authorize('Procurement Officer'), async (req, res) => {
  const { approvalId, deliveryAddress, paymentTerms } = req.body;

  try {
    const approval = await Approval.findById(approvalId);
    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (approval.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Approval request must be approved first' });
    }

    // Check if PO already exists for this quotation
    const existingPo = await PurchaseOrder.findOne({ quotationId: approval.quotationId });
    if (existingPo) {
      return res.status(400).json({ message: 'Purchase Order already generated for this approved quotation', po: existingPo });
    }

    // Fetch Quotation
    const quotation = await Quotation.findById(approval.quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Map quotation items to PO items
    const lineItems = quotation.lineItems.map(item => ({
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    }));

    const po = new PurchaseOrder({
      rfqId: approval.rfqId,
      quotationId: approval.quotationId,
      vendorId: approval.vendorId,
      lineItems,
      totalAmount: approval.amount,
      deliveryAddress: deliveryAddress || 'Company Headquarters, Sector 63, Noida, UP',
      paymentTerms: paymentTerms || quotation.paymentTerms,
      status: 'sent'
    });

    const savedPo = await po.save();
    const populatedPo = await savedPo.populate('vendorId', 'name');

    // Update RFQ status to Completed
    await RFQ.findByIdAndUpdate(approval.rfqId, { status: 'Completed' });

    // Audit Log
    await logActivity(
      `Purchase Order Generated: ${savedPo.poNumber}`,
      'PO',
      req.user.name,
      `Vendor: ${populatedPo.vendorId.name}, Amount: INR ${savedPo.totalAmount}`
    );

    res.status(201).json(savedPo);
  } catch (error) {
    console.error('Error generating PO:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create an Invoice from PO ID
// @route   POST /api/invoice
// @access  Private (Procurement Officer / Vendor)
router.post('/invoice', protect, async (req, res) => {
  const { poId, dueDate } = req.body;

  try {
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Check if invoice already exists for this PO
    const existingInvoice = await Invoice.findOne({ poId });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice already generated for this PO', invoice: existingInvoice });
    }

    // Subtotal, GST Calculations
    const subtotal = po.totalAmount;
    const cgst = subtotal * 0.09; // 9% CGST
    const sgst = subtotal * 0.09; // 9% SGST
    const grandTotal = subtotal + cgst + sgst;

    // Set due date to 30 days from now if not provided
    const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = new Invoice({
      poId,
      dueDate: calculatedDueDate,
      subtotal,
      cgst,
      sgst,
      grandTotal,
      status: 'Draft'
    });

    const savedInvoice = await invoice.save();
    const populatedInvoice = await savedInvoice.populate({
      path: 'poId',
      populate: { path: 'vendorId', select: 'name' }
    });

    // Audit Log
    await logActivity(
      `Invoice Generated: ${savedInvoice.invoiceNumber}`,
      'Invoice',
      req.user.name,
      `PO Reference: ${po.poNumber}, Vendor: ${populatedInvoice.poId.vendorId.name}, Total: INR ${savedInvoice.grandTotal}`
    );

    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Error generating Invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper: Fetch invoice complete details for PDF/Email
const getCompleteInvoiceDetails = async (invoiceId) => {
  return await Invoice.findById(invoiceId)
    .populate({
      path: 'poId',
      populate: [
        { path: 'vendorId' },
        { path: 'rfqId' }
      ]
    });
};

// Helper: Define invoice PDF document layout
const generateInvoiceDocDefinition = (inv) => {
  const po = inv.poId;
  const vendor = po.vendorId;

  // Format date utility
  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const tableBody = [
    [
      { text: '#', style: 'tableHeader' },
      { text: 'Item Description', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit Price (INR)', style: 'tableHeader', alignment: 'right' },
      { text: 'Amount (INR)', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  po.lineItems.forEach((item, index) => {
    tableBody.push([
      { text: String(index + 1), alignment: 'center' },
      { text: item.name },
      { text: String(item.qty), alignment: 'center' },
      { text: item.unitPrice.toFixed(2), alignment: 'right' },
      { text: item.totalPrice.toFixed(2), alignment: 'right' }
    ]);
  });

  return {
    content: [
      { text: 'INVOICE', style: 'header', alignment: 'right' },
      { text: 'VendorBridge Procurement ERP', style: 'subheader' },
      { text: '\n' },
      {
        columns: [
          {
            text: [
              { text: 'FROM (Buyer):\n', bold: true, color: '#4f46e5' },
              'VendorBridge ERP Services Ltd.\n',
              'Sector 62, Noida\n',
              'Uttar Pradesh, 201301\n',
              'GSTIN: 09AAACV5489B1Z0\n',
              'Email: procurement@vendorbridge.com\n'
            ]
          },
          {
            text: [
              { text: 'TO (Vendor):\n', bold: true, color: '#4f46e5' },
              `${vendor.name}\n`,
              `${vendor.contactPerson}\n`,
              `${vendor.city}\n`,
              `GSTIN: ${vendor.gst}\n`,
              `Phone: ${vendor.phone}\n`
            ],
            alignment: 'right'
          }
        ]
      },
      { text: '\n\n' },
      {
        columns: [
          { text: `Invoice Number: ${inv.invoiceNumber}\nDate: ${formatDate(inv.invoiceDate)}\nDue Date: ${formatDate(inv.dueDate)}`, bold: true },
          { text: `PO Reference: ${po.poNumber}\nPayment Terms: ${po.paymentTerms}\nStatus: ${inv.status.toUpperCase()}`, alignment: 'right', bold: true }
        ]
      },
      { text: '\n' },
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 50, 90, 100],
          body: tableBody
        },
        layout: 'lightHorizontalLines'
      },
      { text: '\n' },
      {
        columns: [
          { text: '' },
          {
            table: {
              widths: [120, 100],
              body: [
                ['Subtotal', { text: `INR ${inv.subtotal.toFixed(2)}`, alignment: 'right' }],
                ['CGST (9%)', { text: `INR ${inv.cgst.toFixed(2)}`, alignment: 'right' }],
                ['SGST (9%)', { text: `INR ${inv.sgst.toFixed(2)}`, alignment: 'right' }],
                [{ text: 'Grand Total', bold: true }, { text: `INR ${inv.grandTotal.toFixed(2)}`, alignment: 'right', bold: true, color: '#4f46e5' }]
              ]
            },
            alignment: 'right',
            layout: 'noBorders'
          }
        ]
      },
      { text: '\n\n\n' },
      { text: 'Thank you for your business!', style: 'footer', alignment: 'center' }
    ],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
      color: '#334155'
    },
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        color: '#1e293b'
      },
      subheader: {
        fontSize: 12,
        color: '#64748b'
      },
      tableHeader: {
        bold: true,
        fontSize: 11,
        color: '#1e293b',
        fillColor: '#f8fafc'
      },
      footer: {
        fontSize: 11,
        italics: true,
        color: '#94a3b8'
      }
    }
  };
};

// @desc    Generate and download Invoice PDF
// @route   GET /api/invoice/:id/pdf
// @access  Private
router.get('/invoice/:id/pdf', protect, async (req, res) => {
  try {
    const inv = await getCompleteInvoiceDetails(req.params.id);
    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const docDefinition = generateInvoiceDocDefinition(inv);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${inv.invoiceNumber}.pdf`);

    pdfDoc.pipe(res);
    pdfDoc.end();

    // Audit Log
    await logActivity(
      `Invoice PDF Downloaded: ${inv.invoiceNumber}`,
      'Invoice',
      req.user.name
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Send invoice email with PDF attachment
// @route   POST /api/invoice/:id/send
// @access  Private
router.post('/invoice/:id/send', protect, async (req, res) => {
  try {
    const inv = await getCompleteInvoiceDetails(req.params.id);
    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const po = inv.poId;
    const vendor = po.vendorId;

    // Check SMTP config
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Generate PDF buffer
    const docDefinition = generateInvoiceDocDefinition(inv);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks);

      if (!smtpUser || !smtpPass) {
        // Simulated email send
        console.warn('SMTP credentials not configured. Simulating email dispatch...');
        
        // Update Invoice status to Sent
        inv.status = 'Sent';
        await inv.save();

        // Audit Log
        await logActivity(
          `Invoice Email Sent (SIMULATED): ${inv.invoiceNumber}`,
          'Invoice',
          req.user.name,
          `Recipient: ${vendor.email}. SMTP variables missing.`
        );

        return res.json({
          message: 'Invoice email sent successfully (SIMULATED MODE)',
          simulated: true,
          recipient: vendor.email
        });
      }

      // Configure SMTP transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: smtpUser,
        to: vendor.email,
        subject: `VendorBridge ERP: Invoice ${inv.invoiceNumber} for Purchase Order ${po.poNumber}`,
        text: `Dear ${vendor.name},\n\nPlease find attached Invoice ${inv.invoiceNumber} corresponding to Purchase Order ${po.poNumber}.\n\nGrand Total: INR ${inv.grandTotal.toFixed(2)}\nDue Date: ${new Date(inv.dueDate).toLocaleDateString()}\n\nBest regards,\nVendorBridge Procurement Team`,
        attachments: [
          {
            filename: `${inv.invoiceNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      };

      try {
        await transporter.sendMail(mailOptions);

        // Update Invoice status to Sent
        inv.status = 'Sent';
        await inv.save();

        // Audit Log
        await logActivity(
          `Invoice Email Sent: ${inv.invoiceNumber}`,
          'Invoice',
          req.user.name,
          `Recipient: ${vendor.email}`
        );

        res.json({ message: 'Invoice email sent successfully via SMTP', recipient: vendor.email });
      } catch (err) {
        console.error('SMTP Delivery Failed:', err);
        res.status(500).json({ message: 'Failed to send email. Check credentials.', error: err.message });
      }
    });

    pdfDoc.end();

  } catch (error) {
    console.error('Error in send invoice email route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all purchase orders
// @route   GET /api/po
// @access  Private
router.get('/po', protect, async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('rfqId', 'rfqId title')
      .populate('vendorId', 'name contactPerson email phone')
      .sort({ createdAt: -1 });
    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all invoices
// @route   GET /api/invoice
// @access  Private
router.get('/invoice', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate({
        path: 'poId',
        populate: { path: 'vendorId', select: 'name category contactPerson' }
      })
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
