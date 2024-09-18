const express = require("express");
const router = express.Router(); // Correctly initialize the router instance
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const Listing = require("../models/listing.js");

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
  
    if (error) {
        throw new ExpressError(400, error);
    } else {
        next();
    }
};

// Index Route
router.get("/", wrapAsync(async (req, res) => {
    try {
        const allListings = await Listing.find({});
        res.render("listings/index.ejs", { allListings });
    } catch (err) {
        console.error("Error fetching listings:", err);
        res.status(500).send("Error fetching listings");
    }
}));

// New Route
router.get("/new", (req, res) => {
    res.render("listings/new.ejs");
});

router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    try {
        const listing = await Listing.findById(id).populate("reviews");
        if (!listing) {
            return res.status(404).send("Listing not found");
        }
        res.render("listings/show.ejs", { listing });
    } catch (err) {
        console.error("Error fetching listing:", err);
        res.status(500).send("Error fetching listing");
    }
}));

// Create Route
router.post("/",
    validateListing,
    wrapAsync(async (req, res, next) => {  
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("/listings");
    })
);

// Edit Route
router.get("/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    try {
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send("Listing not found");
        }
        res.render("listings/edit.ejs", { listing });
    } catch (err) {
        console.error("Error fetching listing for edit:", err);
        res.status(500).send("Error fetching listing for edit");
    }
}));

// Update Route
router.put("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    console.log("Received update request for listing:", id);
    console.log("Data to update:", req.body.listing);
    console.log("Uploaded file:", req.file);

    try {
        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send("Listing not found");
        }

        // Update fields
        listing.title = req.body.listing.title;
        listing.description = req.body.listing.description;
        listing.price = req.body.listing.price;
        listing.location = req.body.listing.location;
        listing.country = req.body.listing.country;

        // Update image if a new one is uploaded
        if (req.file) {
            listing.image = { url: `/uploads/${req.file.filename}`, filename: req.file.filename };
        }

        await listing.save();
        console.log("Update successful");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Error updating listing:", err);
        res.status(500).send("Error updating listing");
    }
}));

// Delete Route
router.delete("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    try {
        let deletedListing = await Listing.findByIdAndDelete(id);
        if (!deletedListing) {
            return res.status(404).send("Listing not found");
        }
        console.log("Deleted listing:", deletedListing);
        res.redirect("/listings");
    } catch (err) {
        console.error("Error deleting listing:", err);
        res.status(500).send("Error deleting listing");
    }
}));

module.exports = router;
