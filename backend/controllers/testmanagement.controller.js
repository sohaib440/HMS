const hospitalModel = require("../models/index.model");

const createTest = async (req, res) => {
  try {
    const {
      testName,
      testDept,
      testCode,
      description,
      instructions,
      testPrice,
      requiresFasting,
      reportDeliveryTime,
      fields,
    } = req.body;
    console.log("the req body is", req.body)

    // Process fields to handle normalRange conversion and collect common options
    const processedFields = fields.map(field => {
      const updatedField = { ...field };

      // Convert normalRange object to Map if needed
      if (field.normalRange && !(field.normalRange instanceof Map)) {
        updatedField.normalRange = new Map(Object.entries(field.normalRange));
      }

      // Collect unique units and labels
      updatedField.commonUnits = [...new Set([
        ...(updatedField.commonUnits || []),
        field.unit
      ])].filter(Boolean);

      if (updatedField.normalRange) {
        updatedField.commonLabels = [...new Set([
          ...(updatedField.commonLabels || []),
          ...Array.from(updatedField.normalRange.keys())
        ])].filter(Boolean);
      }

      return updatedField;
    });

    if (!testName || !testCode || !testPrice) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const newTest = new hospitalModel.TestManagment({
      testName,
      testDept,
      testCode,
      description,
      instructions,
      testPrice,
      requiresFasting,
      reportDeliveryTime,
      fields: processedFields,
      isDeleted: false
    });
    console.log("the new test is ", newTest)

    await newTest.save();


    res.status(201).json({
      message: "Test created successfully",
      test: newTest.toObject({ flattenMaps: false }) // Preserve Map structure
    });

  } catch (err) {
    console.error("Error in createTest:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getTests = async (req, res) => {
  try {
    const tests = await hospitalModel.TestManagment.find({ isDeleted: false })
      .sort({ createdAt: -1 });

    if (tests.length === 0) {
      return res.status(200).json({ message: 'No active tests found' });
    }
// console.log("Fetched tests:", tests, "tests found");
    // Convert Maps to objects for frontend
    const testsWithPlainRanges = tests.map(test => {
      const testObj = test.toObject({ flattenMaps: false });
      if (testObj.fields) {
        testObj.fields = testObj.fields.map(field => {
          if (field.normalRange instanceof Map) {
            field.normalRange = Object.fromEntries(field.normalRange);
          }
          return field;
        });
      }
      return testObj;
    });

    res.status(200).json(testsWithPlainRanges);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch tests',
      error: err.message
    });
  }
};

const getTestById = async (req, res) => {
  try {
    const test = await hospitalModel.TestManagment.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!test) {
      return res.status(404).json({ message: "Test not found or is deleted" });
    }

    // Convert Map to object for frontend
    const testObj = test.toObject({ flattenMaps: false });
    if (testObj.fields) {
      testObj.fields = testObj.fields.map(field => {
        if (field.normalRange instanceof Map) {
          field.normalRange = Object.fromEntries(field.normalRange);
        }
        return field;
      });
    }

    res.status(200).json(testObj);
  } catch (err) {
    res.status(500).json({
      message: "Failed to retrieve test",
      error: err.message
    });
  }
};

const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      testName,
      testDept,
      testCode,
      description,
      instructions,
      testPrice,
      requiresFasting,
      reportDeliveryTime,
      fields,
    } = req.body;
    // console.log("the updated data is ", req.body)

    const test = await hospitalModel.TestManagment.findById(id);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    test.testName = testName ?? test.testName;
    test.testDept = testDept ?? test.testDept;
    test.testCode = testCode ?? test.testCode;
    test.description = description ?? test.description;
    test.instructions = instructions ?? test.instructions;
    test.testPrice = testPrice ?? test.testPrice;
    test.requiresFasting = typeof requiresFasting === "boolean" ? requiresFasting : test.requiresFasting;
    test.reportDeliveryTime = reportDeliveryTime ?? test.reportDeliveryTime;

    if (fields && Array.isArray(fields)) {
      test.fields = fields;
    }

    await test.save();
    res.status(200).json({ message: "Test updated successfully", test });
  } catch (err) {
    res.status(500).json({ message: "Failed to update test", error: err.message });
  }
};

const deleteTest = async (req, res) => {
  try {
    const test = await hospitalModel.TestManagment.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: false
      },
      {
        $set: { isDeleted: true }
      },
      {
        new: true
      }
    );

    if (!test) {
      return res.status(404).json({ message: "Test not found or already deleted" });
    }

    res.status(200).json({ message: "Test soft deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to soft delete test",
      error: err.message
    });
  }
};

const recoverTest = async (req, res) => {
  try {
    const test = await hospitalModel.TestManagment.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: true
      },
      {
        $set: { isDeleted: false }
      },
      {
        new: true
      }
    );

    if (!test) {
      return res.status(404).json({
        message: "Test not found or already active"
      });
    }

    res.status(200).json({
      message: "Test recovered successfully",
      test
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to recover test",
      error: err.message
    });
  }
};

// Get common options across all tests
const getCommonOptions = async (req, res) => {
  try {
    const result = await hospitalModel.TestManagment.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$fields" },
      {
        $group: {
          _id: null,
          allUnits: { $addToSet: "$fields.unit" },
          allCommonUnits: { $addToSet: "$fields.commonUnits" },
          allLabels: { $addToSet: "$fields.commonLabels" }
        }
      },
      {
        $project: {
          units: {
            $setUnion: [
              { $reduce: { input: "$allCommonUnits", initialValue: [], in: { $setUnion: ["$$value", "$$this"] } } },
              "$allUnits"
            ]
          },
          labels: {
            $reduce: {
              input: "$allLabels",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] }
            }
          }
        }
      }
    ]);

    const options = result[0] || { units: [], labels: [] };
    res.status(200).json(options);
  } catch (err) {
    res.status(500).json({
      message: "Failed to get common options",
      error: err.message
    });
  }
};

module.exports = {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
  recoverTest,
   getCommonOptions
};  