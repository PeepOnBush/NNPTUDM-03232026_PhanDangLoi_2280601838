var express = require("express");
var router = express.Router();
let importController = require('../controllers/importUsers');
let { checkLogin, checkRole } = require('../utils/authHandler.js');
let multer = require('multer');
let path = require('path');
let fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/temp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.xls') {
            return cb(new Error('Only Excel files are allowed'));
        }
        cb(null, true);
    }
});

// Import users from Excel file
router.post("/upload", 
    checkLogin, 
    checkRole("ADMIN"),
    upload.single('file'),
    async function (req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).send({ 
                    message: "Please upload an Excel file" 
                });
            }

            console.log(`Processing file: ${req.file.filename}`);

            // Parse Excel file
            let users = importController.ParseExcelFile(req.file.path);

            if (!users || users.length === 0) {
                // Delete temp file
                fs.unlinkSync(req.file.path);
                return res.status(400).send({ 
                    message: "No valid users found in Excel file" 
                });
            }

            console.log(`Found ${users.length} users in Excel file`);

            // Send immediate response that processing has started
            res.send({
                message: "Import process started. Emails will be sent every 30 seconds.",
                totalUsers: users.length,
                note: "This process will take approximately " + (users.length * 30) + " seconds. Check server logs for progress."
            });

            // Process users asynchronously
            (async () => {
                try {
                    let results = await importController.ImportUsersFromFile(users);
                    
                    console.log('\n=== IMPORT COMPLETED ===');
                    console.log(`Total: ${users.length}`);
                    console.log(`Success: ${results.success.length}`);
                    console.log(`Failed: ${results.failed.length}`);
                    if (results.failed.length > 0) {
                        console.log('\nFailed users:');
                        results.failed.slice(0, 5).forEach(f => {
                            console.log(`- ${f.username} (${f.email}): ${f.reason}`);
                        });
                        if (results.failed.length > 5) {
                            console.log(`... and ${results.failed.length - 5} more`);
                        }
                    }
                    console.log('========================\n');
                    
                    // Delete temp file
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.error('Import error:', error);
                    // Delete temp file
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                }
            })();

        } catch (error) {
            // Delete temp file if exists
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(400).send({ message: error.message });
        }
    }
);

// Import users from JSON array (original method)
router.post("/", 
    checkLogin, 
    checkRole("ADMIN"), 
    async function (req, res, next) {
        try {
            let users = req.body.users;

            if (!users || !Array.isArray(users) || users.length === 0) {
                return res.status(400).send({ 
                    message: "Users array is required. Format: { users: [{ username, email }, ...] }" 
                });
            }

            // Validate each user has username and email
            for (let user of users) {
                if (!user.username || !user.email) {
                    return res.status(400).send({ 
                        message: "Each user must have username and email" 
                    });
                }
            }

            let results = await importController.ImportUsersFromFile(users);

            res.send({
                message: "Import completed",
                total: users.length,
                successCount: results.success.length,
                failedCount: results.failed.length,
                results: results
            });

        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    }
);

module.exports = router;
