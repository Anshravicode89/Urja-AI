require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const bodyParser = require('body-parser');
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const Localstrategy = require("passport-local");
const { isLoggedIn } = require("./middleware.js");
const User = require("./models/user.js");
const userRouter = require("./routes/user.js");
const listingController = require("./controllers/listings.js");
const nodemailer = require('nodemailer');
// Cloudinary configuration
const { cloudinary, storage } = require('./cloudConfig');
const multer = require('multer');
const upload = multer({ storage });

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("Error connecting to DB:", err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine('ejs', ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(bodyParser.urlencoded({ extended: true }));

const sessionOptions = {
  secret: "Mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Localstrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currUser = req.user;
  next();
});

app.get("/demouser", async (req, res) => {
  let fakeUser = new User({
    email: "big@gmail.com",
    username: "Cotton-field",
  });

  let registeredUser = await User.register(fakeUser, "helloworld");
  res.send(registeredUser);
})

app.use("/", userRouter);

// Contact route to handle form submission
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // Set up nodemailer transporter (Gmail used in this example)
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com', // your Gmail address
      pass: 'your-email-password'    // your Gmail password or App Password
    }
  });

  // Set up email data
  let mailOptions = {
    from: email, // sender address (email entered by the user)
    to: 'anshravi177a@gmail.com', // your email where the form details will be sent
    subject: `Contact form submission from ${name}`, // Subject line
    text: `You have a new message from ${name} (${email}):\n\n${message}`, // plain text body
  };

  // Send email using the transporter
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send('Error sending email: ' + error.message);
    }
    res.send('Email sent successfully!');
  });
});

// Test Route
app.get("/testListing", async (req, res) => {
  let sampleListing = new Listing({
    title: "My new Villa",
    description: "By the beach",
    image: "http://example.com/image.jpg", // Include an image URL if your schema requires it
    price: 1200,
    location: "Goa",
    country: "India",
  });

  try {
    await sampleListing.save();
    console.log("Sample was saved");
    res.send("Successful testing");
  } catch (err) {
    console.error("Error saving sample:", err);
    res.status(500).send("Error saving sample");
  }
});

const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);

  if (error) {
    throw new ExpressError(400, result.error);
  } else {
    next();
  }
}

const validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, result.error);
  } else {
    next();
  }
}
//home route
app.get("/", (req, res) => {
  res.render("listings/home.ejs");
});


// Routes for permanent listings
app.get('/date', (req, res) => {
  res.render('show1'); // show1.ejs for Date
});

app.get('/time', (req, res) => {
  res.render('show2'); // show2.ejs for Time
});

app.get('/weather', (req, res) => {
  res.render('show3'); // show3.ejs for Weather
});

app.get('/public-holidays', (req, res) => {
  res.render('show4'); // show4.ejs for Public Holidays
});
app.get('/weekly-holidays', (req, res) => {
  res.render('show5'); // show5.ejs for Weekly Holidays
});
app.get('/reviews', (req, res) => {
  res.render('review');
});
app.get('/contact', (req, res) => {
  res.render('contact');
});
app.get('/report', (req, res) => {
  res.render('report');
});



// Index Route
app.get("/listings", wrapAsync(async (req, res) => {
  try {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).send("Error fetching listings");
  }
}));

// New Route
app.get("/listings/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

app.get("/listings/:id", wrapAsync(async (req, res) => {
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
app.post("/listings", isLoggedIn, upload.single('imageFile'), validateListing, wrapAsync(async (req, res, next) => {
  let result = listingSchema.validate(req.body);
  const newListing = new Listing(req.body.listing);
  newListing.image = { url: req.file.path, filename: req.file.filename };
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
}));

//Search
app.get("/search", wrapAsync(listingController.search));

app.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isLoggedIn, upload.single('listing[image]'), validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, wrapAsync(listingController.destroyListing));


// Edit Route
app.get("/listings/:id/edit",isLoggedIn, wrapAsync(async (req, res) => {
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
app.put("/listings/:id",upload.single('listing[image]'), isLoggedIn, wrapAsync(async (req, res) => {
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
      listing.image = { url: req.file.path, filename: req.file.filename };
    }

    await listing.save();
    console.log("Update successful");
    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Error updating listing:", err);
    res.status(500).send("Error updating listing");
  }
}));

// Delete Route
app.delete("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
  let { id } = req.params;
  try {
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
      return res.status(404).send("Listing not found");
    }
    console.log("Deleted listing:", deletedListing);
    req.flash("success", "Listing Deleted Successfully!");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error deleting listing:", err);
    res.status(500).send("Error deleting listing");
  }
}));

// Reviews post route
app.post("/listings/:id/reviews",isLoggedIn, validateReview, wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  const review = new Review(req.body.review);
  review.author = req.user._id;
  listing.reviews.push(review);
  await review.save();
  await listing.save();
  req.flash("success", "Created new review");
  res.redirect(`/listings/${id}`);
}));

// Review delete route
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn, wrapAsync(async (req, res) => {
  let { id, reviewId } = req.params;
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  req.flash("success", "Successfully deleted review");
  res.redirect(`/listings/${id}`);
}));

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).send(message);
});

const port = 8090;
app.listen(port, () => {
  console.log(`Serving on port ${port}`);
});
