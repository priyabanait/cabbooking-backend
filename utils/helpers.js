// Calculate distance between two coordinates using Haversine formula
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

// Convert degrees to radians
const toRad = (value) => {
  return (value * Math.PI) / 180;
};

// Calculate fare based on distance and vehicle type
exports.calculateFare = (distance, vehicleType) => {
  const baseRates = {
    hatchback: { base: 50, perKm: 10 },
    sedan: { base: 80, perKm: 15 },
    suv: { base: 100, perKm: 20 },
    luxury: { base: 200, perKm: 30 }
  };

  const rates = baseRates[vehicleType] || baseRates.sedan;
  const fare = rates.base + (distance * rates.perKm);
  
  return Math.round(fare);
};

// Calculate estimated duration (in minutes)
exports.calculateDuration = (distance) => {
  const avgSpeed = 30; // km/h average speed in city
  const duration = (distance / avgSpeed) * 60;
  return Math.round(duration);
};

// Format error response
exports.errorResponse = (message, statusCode = 500) => {
  const error = new Error(message);
  error.status = statusCode;
  return error;
};

// Success response format
exports.successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};
