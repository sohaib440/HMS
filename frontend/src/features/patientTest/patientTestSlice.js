import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_REACT_APP_API_URL;
// console.log("API URL:", API_URL);
// 🔐 Get headers with token for auth
const getAuthHeaders = () => {
  const jwtLoginToken = localStorage.getItem("jwtLoginToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwtLoginToken}`,
  };
};

// ✅ Thunk: Submit Lab Test
export const SubmitPatientTest = createAsyncThunk(
  "patientTest/SubmitPatientTest",
  async (patientData, { rejectWithValue }) => {
    try {
      // console.log("🧪 Data submittedddddddddddddddddddddd:", patientData);

      const response = await axios.post(
        `${API_URL}/patientTest/patient-test`,
        patientData,
        { headers: getAuthHeaders() }
      );
      console.log("✅ Server Response:", response?.data?.data);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit lab test";
      return rejectWithValue({
        message,
        statusCode: error.response?.status || 500,
      });
    }
  }
);

// ✅ Thunk: Fetch Patient by MR No
export const fetchPatientByMRNo = createAsyncThunk(
  "patientTest/fetchPatientByMRNo",
  async (mrNo, { rejectWithValue }) => {
    
    try {
      console.log("Fetching patient with MR No:", mrNo);

      const response = await axios.get(`${API_URL}/patientTest/mrno/${mrNo}`,
         { headers: getAuthHeaders() }
      );

      // console.log("the mr number ", response);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch patient";
      return rejectWithValue({ message });
    }
  }
);

export const fetchPatientTestAll = createAsyncThunk(
  "patientTest/fetchPatientTestAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/patientTest`, {
        headers: getAuthHeaders(),
      });
      return response.data.data.patientTests;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch all patient tests";
      return rejectWithValue({ message });
    }
  }
);

export const fetchPatientTestById = createAsyncThunk(
  "patientTest/fetchPatientTestById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/patientTest/${id}`, {
        headers: getAuthHeaders(),
      });
      console.log("📄 Patient Test by ID fetched:", response.data?.data);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch patient test by ID";
      return rejectWithValue({ message });
    }
  }
);

export const fetchAllTests = createAsyncThunk(
  "patientTest/fetchAllTests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/testManagement/getAlltest`, {
        headers: getAuthHeaders(),
      });
      // Ensure we always return an array, even if response structure is unexpected
      const tests = response.data?.activeTests || response.data || [];
      return Array.isArray(tests) ? tests : [];
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch tests";
      return rejectWithValue({
        message,
        status: error.response?.status || 500,
      });
    }
  }
);

export const getTestHistory = createAsyncThunk(
  "patientTest/getTestHistory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/patientTest/test/patient-test-history`,
        {
          headers: getAuthHeaders(),
        }
      );
      console.log("📄 Test history fetched:", response.data.data);
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch test history";
      return rejectWithValue({
        message,
        statusCode: error.response?.status || 500,
      });
    }
  }
);

//update
export const updatepatientTest = createAsyncThunk(
  "patientTest/updatepatientTest",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${API_URL}/patientTest/update-patienttest/${id}`,
        updateData,
        { headers: getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update patient test";
      return rejectWithValue({
        message,
        statusCode: error.response?.status || 500,
      });
    }
  }
);

//Delete test
export const deletepatientTest = createAsyncThunk(
  "patientTest/deletepatientTest",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/patientTest/${id}`, {
        headers: getAuthHeaders(),
      });
      return id; // Just return the ID for the reducer
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete patient test";
      return rejectWithValue({
        message,
        statusCode: error.response?.status || 500,
      });
    }
  }
);

const initialState = {
  patient: null,
  allPatientTests: [],
  allPatients: [],
  tests: [],
  testHistory: [],
  stats: {
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    urgentTests: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    completedRevenue: 0,
    refundedRevenue: 0,
    remainingRevenue: 0,
  },
  alerts: [],
  loading: false,
  error: null,
  status: {
    submit: "idle",
    fetch: "idle",
    fetchAll: "idle",
    fetchById: "idle",
    fetchTests: "idle",
  },
  patientTestById: null,
  isLoading: false,
  isError: false,
};

// 🧠 Slice
const patienttestSlice = createSlice({
  name: "patientTest",
  initialState,
  reducers: {
    resetPatientTestStatus: (state) => {
      state.status.submit = "idle";
      state.status.fetch = "idle";
      state.isError = false;
      state.error = null;
      state.patient = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔁 Submit Lab Test
      .addCase(SubmitPatientTest.pending, (state) => {
        state.status.submit = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(SubmitPatientTest.fulfilled, (state, action) => {
        state.status.submit = "succeeded";
        state.isLoading = false;
        state.patient = action.payload?.patient || action.payload;
      })
      .addCase(SubmitPatientTest.rejected, (state, action) => {
        state.status.submit = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload.message || "Lab test submission failed";
      })

      // 🔁 Fetch Patient by MR No
      .addCase(fetchPatientByMRNo.pending, (state) => {
        state.status.fetch = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(fetchPatientByMRNo.fulfilled, (state, action) => {
        state.status.fetch = "succeeded";
        state.isLoading = false;
        state.patient = action.payload;
      })
      .addCase(fetchPatientByMRNo.rejected, (state, action) => {
        state.status.fetch = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload.message || "Failed to fetch patient";
      })

      .addCase(fetchPatientTestById.pending, (state) => {
        state.status.fetchById = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(fetchPatientTestById.fulfilled, (state, action) => {
        state.status.fetchById = "succeeded";
        state.isLoading = false;
        state.patientTestById = action.payload;
      })
      .addCase(fetchPatientTestById.rejected, (state, action) => {
        state.status.fetchById = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error =
          action.payload.message || "Failed to fetch patient test by ID";
      })
      .addCase(fetchPatientTestAll.pending, (state) => {
        state.status.fetchAll = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(fetchPatientTestAll.fulfilled, (state, action) => {
        state.status.fetchAll = "succeeded";
        state.isLoading = false;
        state.allPatientTests = action.payload;
      })
      .addCase(fetchPatientTestAll.rejected, (state, action) => {
        state.status.fetchAll = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error =
          action.payload.message || "Failed to fetch all patient tests";
      })

      // 🔁 Fetch All Tests
      .addCase(fetchAllTests.pending, (state) => {
        state.status.fetchTests = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(fetchAllTests.fulfilled, (state, action) => {
        state.status.fetchTests = "succeeded";
        state.isLoading = false;
        state.tests = action.payload;
      })
      .addCase(fetchAllTests.rejected, (state, action) => {
        state.status.fetchTests = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload.message || "Failed to fetch tests";
      })

      .addCase(getTestHistory.pending, (state) => {
        state.status.fetchAll = "pending";
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(getTestHistory.fulfilled, (state, action) => {
        state.status.fetchAll = "succeeded";
        state.isLoading = false;
        state.testHistory = action.payload.tests || action.payload;
        state.stats = action.payload.stats || state.stats;
        state.alerts = action.payload.alerts || state.alerts;
      })
      .addCase(getTestHistory.rejected, (state, action) => {
        state.status.fetchAll = "failed";
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload.message || "Failed to fetch test history";
      });
  },
});

export const { resetPatientTestStatus } = patienttestSlice.actions;
export default patienttestSlice.reducer;  