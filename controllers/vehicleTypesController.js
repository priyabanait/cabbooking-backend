// Vehicle Types Controller
// Provides vehicle type options for fare configuration and booking

// In-memory storage (replace with database in production)
let vehicleTypes = [
  { id: 1, value: 'bike_direct', label: 'Bike Direct', category: 'active', image: '/images/vehicles/bike.png' },
  { id: 2, value: 'auto', label: 'Auto', category: 'active', image: '/images/vehicles/auto.png' },
  { id: 3, value: 'auto_priority', label: 'Auto Priority', category: 'active', image: '/images/vehicles/auto-priority.png' },
  { id: 4, value: 'cab_non_ac', label: 'Cab Non AC', category: 'active', image: '/images/vehicles/cab-non-ac.png' },
  { id: 5, value: 'cab_ac', label: 'Cab AC', category: 'active', image: '/images/vehicles/cab-ac.png' },
  { id: 6, value: 'cab_ac_sedan', label: 'Cab AC Sedan', category: 'active', image: '/images/vehicles/sedan.png' },
  { id: 7, value: 'cab_premium', label: 'Cab Premium', category: 'active', image: '/images/vehicles/premium.png' },
  { id: 8, value: 'cab_xl', label: 'Cab XL', category: 'active', image: '/images/vehicles/xl.png' },
  { id: 9, value: 'auto_pet', label: 'Auto Pet', category: 'active', image: '/images/vehicles/auto-pet.png' },
  // Legacy vehicle types
  { id: 10, value: 'sedan', label: 'Sedan (Legacy)', category: 'legacy', image: '/images/vehicles/sedan.png' },
  { id: 11, value: 'suv', label: 'SUV (Legacy)', category: 'legacy', image: '/images/vehicles/suv.png' },
  { id: 12, value: 'hatchback', label: 'Hatchback (Legacy)', category: 'legacy', image: '/images/vehicles/hatchback.png' },
  { id: 13, value: 'luxury', label: 'Luxury (Legacy)', category: 'legacy', image: '/images/vehicles/luxury.png' }
];

const getVehicleTypes = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: vehicleTypes
    });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle types',
      error: error.message
    });
  }
};

const createVehicleType = async (req, res) => {
  try {
    const { value, label, category, image } = req.body;

    // Validation
    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Value and label are required'
      });
    }

    // Check if vehicle type already exists
    const exists = vehicleTypes.find(type => type.value === value);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type with this value already exists'
      });
    }

    // Create new vehicle type
    const newVehicleType = {
      id: vehicleTypes.length + 1,
      value,
      label,
      category: category || 'active',
      image: image || '/images/vehicles/default.png'
    };

    vehicleTypes.push(newVehicleType);

    res.status(201).json({
      success: true,
      message: 'Vehicle type created successfully',
      data: newVehicleType
    });
  } catch (error) {
    console.error('Error creating vehicle type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle type',
      error: error.message
    });
  }
};

const updateVehicleType = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, category, image } = req.body;

    const index = vehicleTypes.findIndex(type => type.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found'
      });
    }

    // Update vehicle type
    vehicleTypes[index] = {
      ...vehicleTypes[index],
      value: value || vehicleTypes[index].value,
      label: label || vehicleTypes[index].label,
      category: category || vehicleTypes[index].category,
      image: image || vehicleTypes[index].image
    };

    res.status(200).json({
      success: true,
      message: 'Vehicle type updated successfully',
      data: vehicleTypes[index]
    });
  } catch (error) {
    console.error('Error updating vehicle type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle type',
      error: error.message
    });
  }
};

const deleteVehicleType = async (req, res) => {
  try {
    const { id } = req.params;

    const index = vehicleTypes.findIndex(type => type.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found'
      });
    }

    const deleted = vehicleTypes.splice(index, 1);

    res.status(200).json({
      success: true,
      message: 'Vehicle type deleted successfully',
      data: deleted[0]
    });
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle type',
      error: error.message
    });
  }
};

module.exports = {
  getVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType
};
