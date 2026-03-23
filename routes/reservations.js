var express = require("express");
var router = express.Router();
let reservationController = require('../controllers/reservations');
let { checkLogin } = require('../utils/authHandler.js');
const { default: mongoose } = require("mongoose");

// Get all reservations of current user
router.get("/", checkLogin, async function (req, res, next) {
  try {
    let userId = req.user._id;
    let reservation = await reservationController.GetReservationsByUser(userId);
    
    if (!reservation) {
      return res.status(404).send({ message: "No reservation found" });
    }
    
    res.send(reservation);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Get one reservation by ID
router.get("/:id", checkLogin, async function (req, res, next) {
  try {
    let userId = req.user._id;
    let reservationId = req.params.id;
    
    let reservation = await reservationController.GetReservationById(reservationId, userId);
    
    if (!reservation) {
      return res.status(404).send({ message: "Reservation not found" });
    }
    
    res.send(reservation);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Reserve a cart
router.post("/reserveACart", checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let userId = req.user._id;
    let reservation = await reservationController.ReserveACart(userId, session);
    
    await session.commitTransaction();
    session.endSession();
    
    res.send(reservation);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send({ message: error.message });
  }
});

// Reserve specific items
router.post("/reserveItems", checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let userId = req.user._id;
    let items = req.body.items; // [{ productId, quantity }, ...]
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: "Items array is required" });
    }
    
    let reservation = await reservationController.ReserveItems(userId, items, session);
    
    await session.commitTransaction();
    session.endSession();
    
    res.send(reservation);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send({ message: error.message });
  }
});

// Cancel reservation
router.post("/cancelReserve/:id", checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let userId = req.user._id;
    let reservationId = req.params.id;
    
    let reservation = await reservationController.CancelReserve(reservationId, userId, session);
    
    await session.commitTransaction();
    session.endSession();
    
    res.send(reservation);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;
