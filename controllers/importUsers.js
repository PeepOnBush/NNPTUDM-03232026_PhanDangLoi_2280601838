let userModel = require('../schemas/users');
let roleModel = require('../schemas/roles');
let cartModel = require('../schemas/cart');
let bcrypt = require('bcrypt');
let { sendPasswordEmail } = require('../utils/sendMailHandler');
let XLSX = require('xlsx');

// Generate random password
function generateRandomPassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Parse Excel file
function parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    return data.map(row => ({
        username: row.username || row.Username || row.USERNAME,
        email: row.email || row.Email || row.EMAIL
    }));
}

module.exports = {
    ParseExcelFile: parseExcelFile,
    
    ImportUsersFromFile: async function (users) {
        // users format: [{ username, email }, ...]
        
        let results = {
            success: [],
            failed: []
        };

        // Get USER role
        let userRole = await roleModel.findOne({ name: 'USER' });
        if (!userRole) {
            throw new Error('USER role not found in database');
        }

        for (let i = 0; i < users.length; i++) {
            let userData = users[i];
            
            try {
                // Validate data
                if (!userData.username || !userData.email) {
                    results.failed.push({
                        username: userData.username || 'N/A',
                        email: userData.email || 'N/A',
                        reason: 'Missing username or email'
                    });
                    continue;
                }

                // Check if user already exists
                let existingUser = await userModel.findOne({
                    $or: [
                        { username: userData.username },
                        { email: userData.email }
                    ]
                });

                if (existingUser) {
                    results.failed.push({
                        username: userData.username,
                        email: userData.email,
                        reason: 'User already exists'
                    });
                    continue;
                }

                // Generate random password
                let plainPassword = generateRandomPassword(16);
                let hashedPassword = bcrypt.hashSync(plainPassword, 10);

                // Create user
                let newUser = new userModel({
                    username: userData.username,
                    email: userData.email,
                    password: hashedPassword,
                    role: userRole._id,
                    status: true, // Boolean: true = active
                    loginCount: 0
                });

                await newUser.save();

                // Create cart for user
                let newCart = new cartModel({
                    user: newUser._id
                });
                await newCart.save();

                // Send email with password
                try {
                    console.log(`Sending email to ${userData.email} (${i + 1}/${users.length})...`);
                    await sendPasswordEmail(userData.email, userData.username, plainPassword);
                    
                    results.success.push({
                        username: userData.username,
                        email: userData.email,
                        message: 'User created and email sent successfully'
                    });
                    
                    console.log(`Email sent successfully to ${userData.email}`);
                } catch (emailError) {
                    results.success.push({
                        username: userData.username,
                        email: userData.email,
                        message: 'User created but email failed: ' + emailError.message,
                        password: plainPassword // Include password in response if email fails
                    });
                    
                    console.log(`Email failed for ${userData.email}: ${emailError.message}`);
                }

                // Wait 30 seconds before next email (rate limiting)
                if (i < users.length - 1) {
                    console.log(`Waiting 30 seconds before next email...`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }

            } catch (error) {
                console.log(`Failed to create user ${userData.username}: ${error.message}`);
                results.failed.push({
                    username: userData.username,
                    email: userData.email,
                    reason: error.message
                });
            }
        }

        return results;
    }
};
