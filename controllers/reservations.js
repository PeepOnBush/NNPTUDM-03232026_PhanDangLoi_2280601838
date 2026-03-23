let reservationModel = require('../schemas/reservations');
let cartModel = require('../schemas/cart');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

module.exports = {
  // Get all reservations of a user
  GetReservationsByUser: async function (userId) {
    return await reservationModel.findOne({
      user: userId
    }).populate({
      path: 'items.product',
      select: 'title price slug'
    });
  },

  // Get one reservation by ID
  GetReservationById: async function (reservationId, userId) {
    return await reservationModel.findOne({
      _id: reservationId,
      user: userId
    }).populate({
      path: 'items.product',
      select: 'title price slug'
    });
  },

  // Reserve items from cart
  ReserveACart: async function (userId, session) {
    // Get user's cart
    let cart = await cartModel.findOne({ user: userId }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Get or create reservation
    let reservation = await reservationModel.findOne({ user: userId }).session(session);
    if (!reservation) {
      reservation = new reservationModel({
        user: userId,
        items: [],
        totalAmount: 0,
        ExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }

    let totalAmount = 0;
    let reservationItems = [];

    // Process each item in cart
    for (let cartItem of cart.items) {
      let product = await productModel.findById(cartItem.product).session(session);
      if (!product) {
        throw new Error(`Product ${cartItem.product} not found`);
      }

      let inventory = await inventoryModel.findOne({ product: cartItem.product }).session(session);
      if (!inventory) {
        throw new Error(`Inventory for product ${cartItem.product} not found`);
      }

      let availableStock = inventory.stock - inventory.reserved;
      if (availableStock < cartItem.quantity) {
        throw new Error(`Not enough stock for product ${product.title}`);
      }

      // Update inventory
      inventory.reserved += cartItem.quantity;
      await inventory.save({ session });

      // Add to reservation
      let subtotal = product.price * cartItem.quantity;
      reservationItems.push({
        product: cartItem.product,
        quantity: cartItem.quantity,
        price: product.price,
        subtotal: subtotal
      });

      totalAmount += subtotal;
    }

    // Update reservation
    reservation.items = reservationItems;
    reservation.totalAmount = totalAmount;
    reservation.status = 'actived';
    await reservation.save({ session });

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    return reservation;
  },

  // Reserve specific items
  ReserveItems: async function (userId, items, session) {
    // items format: [{ productId, quantity }, ...]
    
    // Get or create reservation
    let reservation = await reservationModel.findOne({ user: userId }).session(session);
    if (!reservation) {
      reservation = new reservationModel({
        user: userId,
        items: [],
        totalAmount: 0,
        ExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    let totalAmount = 0;
    let reservationItems = [];

    // Process each item
    for (let item of items) {
      let product = await productModel.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      let inventory = await inventoryModel.findOne({ product: item.productId }).session(session);
      if (!inventory) {
        throw new Error(`Inventory for product ${item.productId} not found`);
      }

      let availableStock = inventory.stock - inventory.reserved;
      if (availableStock < item.quantity) {
        throw new Error(`Not enough stock for product ${product.title}`);
      }

      // Update inventory
      inventory.reserved += item.quantity;
      await inventory.save({ session });

      // Add to reservation
      let subtotal = product.price * item.quantity;
      reservationItems.push({
        product: item.productId,
        quantity: item.quantity,
        price: product.price,
        subtotal: subtotal
      });

      totalAmount += subtotal;
    }

    // Update reservation
    reservation.items = reservationItems;
    reservation.totalAmount = totalAmount;
    reservation.status = 'actived';
    await reservation.save({ session });

    return reservation;
  },

  // Cancel reservation
  CancelReserve: async function (reservationId, userId, session) {
    let reservation = await reservationModel.findOne({
      _id: reservationId,
      user: userId
    }).session(session);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === 'cancelled') {
      throw new Error('Reservation already cancelled');
    }

    // Release reserved items back to inventory
    for (let item of reservation.items) {
      let inventory = await inventoryModel.findOne({ product: item.product }).session(session);
      if (inventory) {
        inventory.reserved -= item.quantity;
        await inventory.save({ session });
      }
    }

    // Update reservation status
    reservation.status = 'cancelled';
    await reservation.save({ session });

    return reservation;
  }
};
