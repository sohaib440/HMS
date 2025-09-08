import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_REACT_APP_API_URL;

const getAuthHeaders = () => {
  const jwtLoginToken = localStorage.getItem("jwtLoginToken");
  if (!jwtLoginToken) {
    console.warn("JWT token not found in localStorage!");
    throw new Error('No JWT token found. Please log in.');
  }
  return {
    headers: {
      Authorization: `Bearer ${jwtLoginToken}`,
    },
  };
};

// Async thunks
export const fetchPatients = createAsyncThunk(
  "patients/fetchPatients",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/patient/get-patients`,
        getAuthHeaders()
      );
      return response.data.information.patients;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPatientById = createAsyncThunk(
  "patients/fetchById",
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/patient/get-patient-by-id/${patientId}`,
        getAuthHeaders()
      );
      return response.data.information.patient;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createPatient = createAsyncThunk(
  "patients/createPatient",
  async (newPatient, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/patient/create-patient`,
        newPatient,
        getAuthHeaders()
      );
      return response.data.information.patient;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updatePatient = createAsyncThunk(
  "patients/updatePatient",
  async ({ mrNo, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/patient/update-patient/${mrNo}`,
        updatedData,
        getAuthHeaders()
      );
      return response.data.information.patient; // Fixed: should be patient, not updatedPatient
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPatientByMrNo = createAsyncThunk(
  'patients/fetchByMrNo',
  async (patientMRNo, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/patient/get-patient-by-mrno/${patientMRNo}`,
        getAuthHeaders(),
      );
      return response.data?.information?.patient;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error.message || "Failed to fetch patient"
      );
    }
  }
);

export const deletePatient = createAsyncThunk(
  "patients/deletePatient",
  async (patientId, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${API_URL}/patient/delete-patient/${patientId}`,
        getAuthHeaders()
      );
      return patientId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Search patients async thunk (missing from your original)
export const searchPatients = createAsyncThunk(
  "patients/searchPatients",
  async (searchTerm, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/patient/search-patients?searchTerm=${encodeURIComponent(searchTerm)}`,
        getAuthHeaders()
      );
      return response.data.information.patients;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Patient slice
const patientSlice = createSlice({
  name: "patients",
  initialState: {
    patients: [],
    selectedPatient: null,
    searchResults: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    selectedPatientStatus: "idle",
    searchStatus: "idle",
    error: null,
  },
  reducers: {
    clearSelectedPatient: (state) => {
      state.selectedPatient = null;
      state.selectedPatientStatus = "idle";
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchStatus = "idle";
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPatient: (state, action) => {  
      state.selectedPatient = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all patients
      .addCase(fetchPatients.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.patients = action.payload;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch patient by ID
      .addCase(fetchPatientById.pending, (state) => {
        state.selectedPatientStatus = "loading";
      })
      .addCase(fetchPatientById.fulfilled, (state, action) => {
        state.selectedPatientStatus = "succeeded";
        state.selectedPatient = action.payload;
      })
      .addCase(fetchPatientById.rejected, (state, action) => {
        state.selectedPatientStatus = "failed";
        state.error = action.payload;
      })

      // Create patient
      .addCase(createPatient.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createPatient.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.patients.push(action.payload);
      })
      .addCase(createPatient.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update patient
      .addCase(updatePatient.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedPatient = action.payload;

        // Update patients list
        state.patients = state.patients.map(patient =>
          patient.patient_MRNo === updatedPatient.patient_MRNo ? updatedPatient : patient
        );

        // Update selected patient if it's the one being edited
        if (state.selectedPatient?.patient_MRNo === updatedPatient.patient_MRNo) {
          state.selectedPatient = updatedPatient;
        }
      })
      .addCase(updatePatient.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch patient by MR No
      .addCase(fetchPatientByMrNo.pending, (state) => {
        state.selectedPatientStatus = "loading";
      })
      .addCase(fetchPatientByMrNo.fulfilled, (state, action) => {
        state.selectedPatientStatus = "succeeded";
        state.selectedPatient = action.payload;
      })
      .addCase(fetchPatientByMrNo.rejected, (state, action) => {
        state.selectedPatientStatus = "failed";
        state.error = action.payload;
      })

      // Delete patient
      .addCase(deletePatient.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deletePatient.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Remove the deleted patient from the state
        state.patients = state.patients.filter(
          (patient) => patient._id !== action.payload
        );
        // Clear selected patient if it was the deleted one
        if (state.selectedPatient?._id === action.payload) {
          state.selectedPatient = null;
          state.selectedPatientStatus = "idle";
        }
      })
      .addCase(deletePatient.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Search patients
      .addCase(searchPatients.pending, (state) => {
        state.searchStatus = "loading";
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        state.searchResults = action.payload;
      })
      .addCase(searchPatients.rejected, (state, action) => {
        state.searchStatus = "failed";
        state.error = action.payload;
      });
  },
});

// Export actions and selectors
export const {
  clearSelectedPatient,
  clearSearchResults,
  clearError
} = patientSlice.actions;

export const selectAllPatients = (state) => state.patients.patients;
export const selectPatients = (state) => state.patients.patients;
export const selectPatientStatus = (state) => state.patients.status;
export const selectSelectedPatient = (state) => state.patients.selectedPatient;
export const selectSelectedPatientStatus = (state) => state.patients.selectedPatientStatus;
export const selectSearchResults = (state) => state.patients.searchResults;
export const selectSearchStatus = (state) => state.patients.searchStatus;
export const selectPatientError = (state) => state.patients.error;
export const { setSelectedPatient } = patientSlice.actions;

export default patientSlice.reducer;