const Listing = require("../models/listing");

module.exports.search = async (req, res) => {
    console.log(req.query.q);
    let input = req.query.q.trim().replace(/\s+/g, " "); // Remove extra spaces

    if (input === "") {
        req.flash("error", "Search value is empty!!!");
        return res.redirect("/listings");
    }

    // Create a regex to perform case-insensitive search
    const regex = new RegExp(input, "i");

    try {
        // Search by title, category, country, or location
        let allListings = await Listing.find({
            $or: [
                { title: { $regex: regex } },
                { category: { $regex: regex } },
                { country: { $regex: regex } },
                { location: { $regex: regex } }
            ]
        }).sort({ _id: -1 });

        if (allListings.length > 0) {
            res.locals.success = `Listings filtered by ${input}`;
            return res.render("listings/index.ejs", { allListings });
        } else {
            req.flash("error", "No listings found for this search criteria!");
            return res.redirect("/listings");
        }
    } catch (err) {
        console.error("Error fetching listings:", err);
        req.flash("error", "Error fetching listings. Please try again later.");
        return res.redirect("/listings");
    }
};
