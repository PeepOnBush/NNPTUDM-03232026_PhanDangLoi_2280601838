let nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    auth: {
        user: "c349c5029d76fc",
        pass: "c07d32004ef98d",
    },
});

// Rate limiting: 30 seconds between emails
let lastEmailTime = 0;
const EMAIL_COOLDOWN = 30000; // 30 seconds

module.exports = {
    sendMail: async function (to, url) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "mail reset passwrod",
            text: "lick vo day de doi passs",
            html: "lick vo <a href=" + url + ">day</a> de doi passs",
        });
    },
    
    sendPasswordEmail: async function (to, username, password) {
        // Check rate limiting
        const now = Date.now();
        const timeSinceLastEmail = now - lastEmailTime;
        
        if (timeSinceLastEmail < EMAIL_COOLDOWN) {
            const waitTime = Math.ceil((EMAIL_COOLDOWN - timeSinceLastEmail) / 1000);
            throw new Error(`Please wait ${waitTime} seconds before sending another email`);
        }
        
        await transporter.sendMail({
            from: '"Admin" <admin@nnptud.com>',
            to: to,
            subject: "Your Account Credentials",
            text: `Hello ${username},\n\nYour account has been created.\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password after first login.`,
            html: `
                <h2>Welcome ${username}!</h2>
                <p>Your account has been created successfully.</p>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><em>Please change your password after first login.</em></p>
            `,
        });
        
        lastEmailTime = Date.now();
    }
}