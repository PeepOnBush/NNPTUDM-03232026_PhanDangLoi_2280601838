let jwt = require('jsonwebtoken')
let userController = require('../controllers/users')
module.exports = {
    checkLogin: async function (req, res, next) {
        try {
            let token
            if (req.cookies.token) {
                token = req.cookies.token
            } else {
                token = req.headers.authorization;
                if (!token) {
                    return res.status(403).send({ message: "No token provided" });
                }
                if (!token.startsWith("Bearer")) {
                    return res.status(403).send({ message: "Invalid token format. Use: Bearer <token>" });
                }
                token = token.split(' ')[1];
                if (!token) {
                    return res.status(403).send({ message: "Token is empty" });
                }
            }
            let result = jwt.verify(token, 'secret');
            if (result && result.exp * 1000 > Date.now()) {
                req.userId = result.id;
                // Get user and add to request
                let user = await userController.FindUserById(result.id);
                if (user) {
                    req.user = user;
                }
                next();
            } else {
                res.status(403).send({ message: "Token expired" });
            }
        } catch (error) {
            res.status(403).send({ message: "Invalid token: " + error.message });
        }
    },
    checkRole: function (...requiredRole) {
        return async function (req, res, next) {
            let userId = req.userId;
            let user = await userController.FindUserById(userId);
            
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }
            
            if (!user.role) {
                return res.status(403).send({ message: "User has no role assigned" });
            }
            
            let currentRole = user.role.name;
            if (requiredRole.includes(currentRole)) {
                req.user = user; // Add user to request for later use
                next();
            } else {
                res.status(403).send({ message: "ban khong co quyen" });
            }
        }
    }
}