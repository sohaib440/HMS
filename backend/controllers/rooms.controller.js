// const hospitalModel = require("../models/index.model")

// const createRooms = async (req, res) => {
//     try {
//         const { department, roomNumber, wardType, bedCount, availableBeds, equipment, floor, features, charges,assignedDoctor } = req.body
//         const newRoom = new hospitalModel.Room({
//             department, roomNumber, wardType, bedCount, availableBeds, equipment, floor, features, charges, assignedDoctor
//         })
//         await newRoom.save();
//         res.status(202).json({ message: "Sccessfully Created New Room", rooms: newRoom })
//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ message: "Error Creating Room", error: error.message })
//     }
// }

// const getAllRooms = async (req, res) => {
//     try {
//         const roomsList = await hospitalModel.Room.find();
//         res.status(202).json({ roomsList })
//     } catch (error) {
//         return res.status(500).json({ message: "Error Fetching Rooms", error: error.message })
//     }
// }

// const getroomById = async (req, res) => {
//     const { id } = req.params
// try {
//     const room = hospitalModel.Room.findById()
//     if (!room) {
//        res.status(404).json({message : "no room found by this id"}) 
//     }
//     res.status(202).json({message : "room found by id successfully ",room})
// } catch (error) {
//     res.status(500).json({message : "error finding room by its id"})
// }
// }

// const updateRoomById = async (req, res) => {
//     const { id } = req.params;
//     const { department, roomNumber, wardType, bedCount, availableBeds, equipment, floor, assignedDoctor, features, charges } = req.body; 

//     console.log("the data is coming the dat form my body ",req.body);

//     try {
//         const room = await hospitalModel.Room.findById(id);
//         if (!room) {
//             return res.status(404).json({ message: "Room not found" });
//         }

//         // Update fields if they exist in the request body
//         room.department = department || room.department;
//         room.roomNumber = roomNumber || room.roomNumber;
//         room.wardType = wardType || room.wardType;
//         room.bedCount = bedCount || room.bedCount;
//         room.availableBeds = availableBeds || room.availableBeds; 
//         room.equipment = equipment || room.equipment;
//         room.floor = floor || room.floor;
//         room.assignedDoctor = assignedDoctor || room.assignedDoctor;
//         room.features = features || room.features;
//         room.charges = charges || room.charges;

//         // Save the updated room
//         await room.save();

//         return res.status(202).json({ room });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const deleteRoom = async (req, res) => {
//     const { id } = req.params
//     try {
//         const room = await hospitalModel.Room.findByIdAndDelete(id)
//         if (!room) {
//             res.status(404).json({ message: "room not found" })
//         }
//         res.status(202).json({ message: "room have deleted successfully", room })
//     } catch (error) {
//         return res.status(500).json({ message: "Error deleting room ", error: error.message })
//     }
// }

// module.exports = {
//     createRooms,
//     getAllRooms,
//     getroomById,
//     updateRoomById,
//     deleteRoom
// };






const hospitalModel = require("../models/index.model")

const createRooms = async (req, res) => {
    try {
        const { department, roomNumber, wardType, bedCount, availableBeds, equipment, floor, features, charges, assignedDoctor } = req.body;
console.log(req.body)
        // Create an array of bed objects
        const beds = [];
        for (let i = 1; i <= bedCount; i++) {
            beds.push({
                number: i,               // Bed number
                status: "available",     // Default status
                otherInfo: ""            // Additional info (can be updated later)
            });
        }

        // Create the room with the beds array
        const newRoom = new hospitalModel.Room({
            department, 
            roomNumber, 
            wardType, 
            bedCount, 
            availableBeds, 
            equipment, 
            floor, 
            features, 
            charges, 
            assignedDoctor,
            beds // Pass the generated beds array with status
        });

        await newRoom.save();
        res.status(202).json({ message: "Successfully Created New Room", rooms: newRoom });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error Creating Room", error: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const roomsList = await hospitalModel.Room.find();
        res.status(202).json({ roomsList })
    } catch (error) {
        return res.status(500).json({ message: "Error Fetching Rooms", error: error.message })
    }
}

const getroomById = async (req, res) => {
    const { id } = req.params
try {
    const room = hospitalModel.Room.findById(id)
    if (!room) {
       res.status(404).json({message : "no room found by this id"}) 
    }
    res.status(202).json({message : "room found by id successfully ",room})
} catch (error) {
    res.status(500).json({message : "error finding room by its id"})
}
}

const updateRoomById = async (req, res) => {
    const { id } = req.params;
    const { department, roomNumber, wardType, bedCount, availableBeds, equipment, floor, assignedDoctor, features, charges, beds } = req.body;

    try {
        // Find the room by ID
        const room = await hospitalModel.Room.findById(id);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // If bedCount is updated, adjust the beds array and statuses
        if (bedCount !== undefined && bedCount !== room.bedCount) {
            // If the new bed count is greater, add new beds
            if (bedCount > room.bedCount) {
                const newBeds = [];
                for (let i = room.bedCount + 1; i <= bedCount; i++) {
                    newBeds.push({
                        number: i,             // Bed number
                        status: "available",   // Default status
                        otherInfo: ""          // Any other info
                    });
                }
                room.beds = room.beds.concat(newBeds);  // Add new beds to the existing ones
            } 
            // If the new bed count is smaller, remove excess beds
            else if (bedCount < room.bedCount) {
                room.beds = room.beds.slice(0, bedCount);  // Remove the excess beds
            }
            room.bedCount = bedCount; // Update bedCount after adjusting the beds array
        }

        // Update other room fields if provided
        room.department = department || room.department;
        room.roomNumber = roomNumber || room.roomNumber;
        room.wardType = wardType || room.wardType;
        room.availableBeds = availableBeds || room.availableBeds;
        room.equipment = equipment || room.equipment;
        room.floor = floor || room.floor;
        room.assignedDoctor = assignedDoctor || room.assignedDoctor;
        room.features = features || room.features;
        room.charges = charges || room.charges;

        // Save the updated room document
        await room.save();

        return res.status(202).json({ room });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deleteRoom = async (req, res) => {
    const { id } = req.params
    try {
        const room = await hospitalModel.Room.findByIdAndDelete(id)
        if (!room) {
            res.status(404).json({ message: "room not found" })
        }
        res.status(202).json({ message: "room have deleted successfully", room })
    } catch (error) {
        return res.status(500).json({ message: "Error deleting room ", error: error.message })
    }
}
module.exports = {
    createRooms,
    getAllRooms,
    getroomById,
    updateRoomById,
    deleteRoom
};