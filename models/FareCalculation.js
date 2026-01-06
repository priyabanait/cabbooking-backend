const mongoose = require('mongoose');

const fareCalculationSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: [
        'bike_direct',
        'auto',
        'auto_priority',
        'cab_non_ac',
        'cab_ac',
        'cab_ac_sedan',
        'cab_premium',
        'cab_xl',
        'auto_pet',
        // Legacy values for backward compatibility
        'sedan',
        'suv',
        'hatchback',
        'luxury'
      ],
      required: true
    },

    baseFare: {
      type: Number,
      required: true
    },

    perKmRate: {
      type: Number,
      required: true
    },

    perMinuteRate: {
      type: Number,
      default: 2 // You can adjust this as per your logic
    },

    minimumFare: {
      type: Number,
      default: 50
    },

    surgeMultiplier: {
      type: Number,
      default: 1 // No surge by default
    },

    // Surge pricing based on geo zones
    zones: [
      {
        name: { type: String, required: true },

        area: {
          type: {
            type: String,
            enum: ['Polygon'],
            default: 'Polygon'
          },
          coordinates: {
            // GeoJSON: [[[lng, lat], [lng, lat] ... ]]
            type: [[[Number]]],
            required: true
          }
        },

        surgeMultiplier: {
          type: Number,
          default: 1
        }
      }
    ],

    isActive: {
      type: Boolean,
      default: true
    }
  },

  // Auto-manage createdAt, updatedAt
  { timestamps: true }
);

// Geo Index for zone area
fareCalculationSchema.index({ "zones.area": "2dsphere" });

module.exports = mongoose.model(
  'FareCalculation',
  fareCalculationSchema
);
