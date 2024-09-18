const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { reviewSchema } = require("../schema.js");
const Listing = require("../models/listing.js"); // Ensure Listing is imported
const Review = require("../models/review.js");

const validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg); // Correct error message handling
  } else {
    next();
  }
};

// Reviews post route
router.post("/", validateReview, wrapAsync(async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).send('Listing not found');
    }

    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(500).send('Internal server error');
  }
}));

// Delete Review route
router.delete("/:reviewId", wrapAsync(async (req, res) => {
  const { id, reviewId } = req.params; // Destructure the request parameters
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  res.redirect(`/listings/${id}`);
}));

module.exports = router;
