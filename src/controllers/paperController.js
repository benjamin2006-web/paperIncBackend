import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary.js';
import Paper from '../models/Paper.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Helper function to check if URL is a raw upload
const isRawUpload = (url) => {
  return (
    url && (url.includes('/raw/upload') || url.includes('resource_type=raw'))
  );
};

// Get papers with filters and access control
export const getPapers = async (req, res, next) => {
  try {
    const { category, trade, year, page = 1, limit = 20 } = req.query;

    // Check if user is admin or VIP
    let isAdmin = false;
    let isVIP = false;
    const token = req.headers.authorization
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if it's an admin
        const admin = await Admin.findById(decoded.id);
        if (admin) {
          isAdmin = true;
        } else {
          // Check if it's a VIP user
          const user = await User.findById(decoded.id);
          if (user && user.isVIPActive()) {
            isVIP = true;
          }
        }
      } catch (e) {
        // Token invalid - treat as non-VIP non-admin
      }
    }

    const filter = {};
    if (category) filter.category = category;
    if (trade) filter.trade = trade;
    if (year) filter.year = parseInt(year);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [papers, total] = await Promise.all([
      Paper.find(filter)
        .select('filename title category trade year isVIPOnly pdfUrl createdAt')
        .sort({ year: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Paper.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: papers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error in getPapers:', error);
    next(error);
  }
};

// Get filter options
export const getFilterOptions = async (req, res, next) => {
  try {
    const [categories, trades, years] = await Promise.all([
      Paper.distinct('category'),
      Paper.distinct('trade'),
      Paper.distinct('year'),
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.sort(),
        trades: trades.sort(),
        years: years.sort((a, b) => b - a),
      },
    });
  } catch (error) {
    console.error('Error in getFilterOptions:', error);
    next(error);
  }
};

// Search papers with access control
export const searchPapers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: [],
      });
    }

    let isAdmin = false;
    let isVIP = false;
    const token = req.headers.authorization
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findById(decoded.id);
        if (admin) {
          isAdmin = true;
        } else {
          const user = await User.findById(decoded.id);
          if (user && user.isVIPActive()) {
            isVIP = true;
          }
        }
      } catch (e) {
        // Token invalid
      }
    }

    const searchTerm = q.trim();
    const isNumber =
      !isNaN(searchTerm) &&
      searchTerm.length === 4 &&
      /^\d{4}$/.test(searchTerm);

    let filter = {};

    if (isNumber) {
      filter.year = parseInt(searchTerm);
    } else {
      filter.$or = [
        { filename: { $regex: searchTerm, $options: 'i' } },
        { title: { $regex: searchTerm, $options: 'i' } },
        { trade: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const papers = await Paper.find(filter)
      .select('filename title category trade year isVIPOnly pdfUrl createdAt')
      .sort({ year: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: papers,
    });
  } catch (error) {
    console.error('Error in searchPapers:', error);
    next(error);
  }
};

// Get search suggestions (public)
export const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const searchTerm = q.trim();
    const isYear = /^\d{4}$/.test(searchTerm);

    const suggestions = [];

    if (isYear) {
      const yearMatches = await Paper.aggregate([
        { $match: { year: parseInt(searchTerm) } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]);

      yearMatches.forEach(function (m) {
        suggestions.push({
          text: m._id.toString(),
          type: 'year',
          count: m.count,
        });
      });
    }

    const tradeMatches = await Paper.aggregate([
      {
        $match: {
          trade: { $regex: searchTerm, $options: 'i' },
          trade: { $ne: null },
        },
      },
      { $group: { _id: '$trade', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    tradeMatches.forEach(function (m) {
      if (m._id) {
        suggestions.push({
          text: m._id,
          type: 'trade',
          count: m.count,
        });
      }
    });

    const titleMatches = await Paper.aggregate([
      {
        $match: {
          $or: [
            { filename: { $regex: searchTerm, $options: 'i' } },
            { title: { $regex: searchTerm, $options: 'i' } },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$filename', '$title'] },
          count: { $sum: 1 },
          display: { $first: { $ifNull: ['$filename', '$title'] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    titleMatches.forEach(function (m) {
      if (m.display) {
        suggestions.push({
          text: m.display,
          type: 'title',
          count: m.count,
        });
      }
    });

    const uniqueSuggestions = [];
    const seen = new Set();

    for (var i = 0; i < suggestions.length; i++) {
      var s = suggestions[i];
      var key = s.type + ':' + s.text;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSuggestions.push(s);
      }
      if (uniqueSuggestions.length >= 6) break;
    }

    res.json({
      success: true,
      data: uniqueSuggestions,
    });
  } catch (error) {
    console.error('Error in getSearchSuggestions:', error);
    next(error);
  }
};

// Create multiple papers (one per trade×year combination)
export const createPapers = async (req, res, next) => {
  try {
    console.log('📝 Creating papers with data:', req.body);

    const { category, trades, years, isVIPOnly } = req.body;
    let tradesArray = [];
    let yearsArray = [];

    try {
      tradesArray = typeof trades === 'string' ? JSON.parse(trades) : trades;
      yearsArray = typeof years === 'string' ? JSON.parse(years) : years;
    } catch (e) {
      tradesArray = trades ? [trades] : [];
      yearsArray = years ? [years] : [];
    }

    var isVIPOnlyValue = isVIPOnly === 'true' || isVIPOnly === true;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    if (!yearsArray || yearsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one year is required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required',
      });
    }

    var papersToCreate = [];

    if (tradesArray && tradesArray.length > 0) {
      for (var i = 0; i < tradesArray.length; i++) {
        var trade = tradesArray[i];
        for (var j = 0; j < yearsArray.length; j++) {
          var year = yearsArray[j];
          papersToCreate.push({
            category: category,
            trade: trade,
            year: parseInt(year),
            filename: req.file.originalname,
            pdfUrl: req.file.path,
            pdfPublicId: req.file.filename,
            isVIPOnly: isVIPOnlyValue,
          });
        }
      }
    } else {
      for (var k = 0; k < yearsArray.length; k++) {
        var year = yearsArray[k];
        papersToCreate.push({
          category: category,
          year: parseInt(year),
          filename: req.file.originalname,
          pdfUrl: req.file.path,
          pdfPublicId: req.file.filename,
          isVIPOnly: isVIPOnlyValue,
        });
      }
    }

    var createdPapers = await Paper.insertMany(papersToCreate);

    console.log('✅ Created ' + createdPapers.length + ' papers successfully');
    console.log('   VIP Only: ' + (isVIPOnlyValue ? 'Yes' : 'No'));

    res.status(201).json({
      success: true,
      message: createdPapers.length + ' papers uploaded successfully',
      count: createdPapers.length,
      data: createdPapers,
    });
  } catch (error) {
    console.error('❌ Error in createPapers:', error);
    next(error);
  }
};

// Delete paper
export const deletePaper = async (req, res, next) => {
  try {
    var paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    var otherPapersWithSameFile = await Paper.countDocuments({
      pdfPublicId: paper.pdfPublicId,
      _id: { $ne: paper._id },
    });

    if (otherPapersWithSameFile === 0) {
      try {
        await cloudinary.uploader.destroy(paper.pdfPublicId, {
          resource_type: 'raw',
        });
        console.log('🗑️ Deleted from Cloudinary:', paper.pdfPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await paper.deleteOne();
    console.log('✅ Paper deleted from database:', paper._id);

    res.json({
      success: true,
      message: 'Paper deleted successfully',
    });
  } catch (error) {
    console.error('Error in deletePaper:', error);
    next(error);
  }
};

// View PDF inline - COMPLETE FIX for inline display
export const viewPDF = async (req, res, next) => {
  try {
    var paper = await Paper.findById(req.params.id).select(
      'pdfUrl isVIPOnly filename title',
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Check if paper is VIP only
    if (paper.isVIPOnly) {
      var token = req.headers.authorization
        ? req.headers.authorization.split(' ')[1]
        : null;
      var isVIP = false;

      if (token) {
        try {
          var decoded = jwt.verify(token, process.env.JWT_SECRET);
          var user = await User.findById(decoded.id);
          if (user && user.isVIPActive()) {
            isVIP = true;
          }
        } catch (e) {
          // Token invalid - not VIP
        }
      }

      if (!isVIP) {
        return res.status(403).json({
          success: false,
          message: 'This paper is only available for VIP users',
        });
      }
    }

    // Check if this is a raw upload (contains /raw/upload in URL)
    const isRaw = isRawUpload(paper.pdfUrl);

    // Determine separator for query parameters
    const separator = paper.pdfUrl.includes('?') ? '&' : '?';

    let redirectUrl;
    if (isRaw) {
      // For raw uploads - MUST use fl_attachment=0 to force inline view
      redirectUrl = `${paper.pdfUrl}${separator}fl_attachment=0&raw_upload=1`;
      console.log('📄 Serving raw PDF inline:', paper.filename);
    } else {
      // Image-type PDFs - force inline with optimizations
      redirectUrl = `${paper.pdfUrl}${separator}fl_attachment=0&quality=40&dpr=0.5&cache=yes`;
      console.log('📄 Serving optimized PDF inline:', paper.filename);
    }

    // Set headers to force inline display in browser
    res.setHeader('Cache-Control', 'public, max-age=7200');
    res.setHeader('Expires', new Date(Date.now() + 7200000).toUTCString());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Type', 'application/pdf');

    console.log('🔗 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error viewing PDF:', error);
    next(error);
  }
};

// Download PDF with VIP access control
export const downloadPDF = async (req, res, next) => {
  try {
    var paper = await Paper.findById(req.params.id).select(
      'pdfUrl isVIPOnly filename title',
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    var user = await User.findById(req.user._id);
    if (!user || !user.isVIPActive()) {
      return res.status(403).json({
        success: false,
        message: 'VIP subscription required to download papers',
      });
    }

    if (paper.isVIPOnly && !user.isVIPActive()) {
      return res.status(403).json({
        success: false,
        message: 'This paper is only available for VIP users',
      });
    }

    // Check if this is a raw upload
    const isRaw = isRawUpload(paper.pdfUrl);
    const separator = paper.pdfUrl.includes('?') ? '&' : '?';

    let downloadUrl;
    if (isRaw) {
      // Raw uploads - use ?dl=1 parameter to force download
      downloadUrl = `${paper.pdfUrl}${separator}dl=1`;
      console.log('📥 Downloading raw PDF:', paper.filename);
    } else {
      // Image-type PDFs - use ?download=1
      downloadUrl = `${paper.pdfUrl}${separator}quality=80&download=1`;
      console.log('📥 Downloading optimized PDF:', paper.filename);
    }

    var filename = encodeURIComponent(
      paper.filename || paper.title || 'document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.pdf"`,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache');

    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Error downloading paper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download paper',
    });
  }
};
