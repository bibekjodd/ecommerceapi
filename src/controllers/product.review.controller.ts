import { ErrorHandler } from "../lib/errorHandler";
import { catchAsyncError } from "../middlewares/catchAsyncError";
import Product from "../models/Product.Model";
import Review from "../models/Review.Model";

export const createOrUpdateReview = catchAsyncError<
  unknown,
  unknown,
  {
    rating?: number;
    comment?: string;
    productId?: string;
    title?: string;
  }
>(async (req, res, next) => {
  const { rating, comment, productId, title } = req.body;
  let review = await Review.findOne({
    product: productId,
    user: req.user._id.toString(),
  });

  let validRating = rating || 0;
  if (validRating <= 1) validRating = 1;
  if (validRating >= 5) validRating = 5;

  if (!review && !rating)
    return next(new ErrorHandler("Please enter required fields", 400));

  let reviewExists = false;
  const product = await Product.findById(productId);
  if (!product) return next(new ErrorHandler("Product doesn't exist", 400));

  if (review) {
    reviewExists = true;
    let totalRatings = product.ratings * product.numOfReviews;
    if (rating) {
      totalRatings = totalRatings - review.rating + validRating;
    }

    product.ratings = totalRatings / product.numOfReviews;

    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (rating) review.rating = validRating;
  } else {
    review = await Review.create({
      user: req.user._id.toString(),
      product: productId,
      title,
      comment,
      rating,
    });

    const totalRatings = product.ratings * product.reviews.length + validRating;
    product.reviews.push(review._id.toString());
    product.numOfReviews = product.reviews.length;
    product.ratings = totalRatings / product.numOfReviews;
  }

  await product.save();
  await review.save();

  res.status(200).json({
    message: reviewExists ? "Product Review Updated" : "Product Reviewed",
  });
});

export const getProductReviews = catchAsyncError<
  unknown,
  unknown,
  unknown,
  { id: string }
>(async (req, res, next) => {
  const product = await Product.findById(req.query.id).populate("reviews");
  if (!product) return next(new ErrorHandler("Product doesn't exist", 400));

  res.status(200).json({ reviews: product.reviews });
});

export const deleteProductReview = catchAsyncError<
  unknown,
  unknown,
  unknown,
  { id: string }
>(async (req, res, next) => {
  const review = await Review.findById(req.query.id);
  if (!review) return next(new ErrorHandler("Review already deleted", 200));
  if (
    req.user._id.toString() !== review.user._id.toString() &&
    req.user.role !== "admin"
  )
    return next(new ErrorHandler("Must be reviewer to delete review", 400));

  const product = await Product.findById(review.product);
  if (!product) return next(new ErrorHandler("Review already deleted", 200));

  const totalRatings = product.ratings * product.numOfReviews - review.rating;
  product.reviews = product.reviews.filter(
    (item) => item.toString() !== review._id.toString()
  );

  product.numOfReviews = product.reviews.length;
  product.ratings = totalRatings / (product.numOfReviews || 1);

  await product.save();
  await review.deleteOne();

  res.status(200).json({ message: "Review deleted successfully" });
});
