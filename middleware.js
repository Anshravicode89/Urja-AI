const Listing = require("./models/listing");
const Review = require("./models/review");
const {listingSchema, reviewSchema} = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = (req, res, next) => {
    
    if (!req.isAuthenticated()) {
      req.session.redirectUrl = req.originalUrl;
      req.flash("error", "You must be logged in to create a listing");
      return res.redirect("/login");
    }
    next();
  };

  module.exports.saveRedirectUrl = (req, res, next) =>{
    if(req.session.redirectUrl){
      res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
  }
  