export const errorMiddleware = (err, req, res, next) => {
  const { message = "Internal Server Error", statusCode = 500 } = err;

  if(err.code==11000){
    const error = Object.keys(err.keyValue).join(",");
    err.message = `${error} already exists`;
    err.statusCode = 400
  }

  if(err.name === "CastError"){
    err.message = `Invalid ${err.path}`;
    err.statusCode = 400
  } 
  return res.status(statusCode).json({
    success: false,
    message: err.message,
    error: err,
  });
};

export const TryCatch = (passFunc) => async (req, res, next) => {
  try {
    await passFunc(req, res, next);
  } catch (error) {
    next(error);
  }
};
