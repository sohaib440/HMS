import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_REACT_APP_API_URL;

const getAuthHeader = () => {
  const jwtLoginToken = localStorage.getItem('jwtLoginToken');
  // console.log("JWT Token from localStorage:", jwtLoginToken); // 🔍 This logs the token
  if (!jwtLoginToken) {
    console.warn("JWT token not found in localStorage!");
    throw new Error('No JWT token found. Please log in.');
  }
  return {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${jwtLoginToken}`,
  };
}

export const createDoctor = createAsyncThunk(
  'doctor/createDoctor',
  async (doctorData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/doctor/create-doctor`, doctorData, {
        headers: getAuthHeader(),
      });
      console.log("Create doctor response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Detailed create doctor error:", error.response?.data || error.message);
      if (error.response) {
        const data = error.response.data || {};
        return rejectWithValue({
          message: data.message || 'Failed to submit doctor data',
          statusCode: error.response.status,
          errors: data.errors,
          errorType: data.errorType,
          field: data.field,
          value: data.value,
        });
      }
      return rejectWithValue({
        message: error.message,
        statusCode: 500
      });
    }
  }
);

export const fetchAllDoctors = createAsyncThunk(
  'doctor/fetchAllDoctors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/doctor/get-doctors`, {
        headers: getAuthHeader(),
      });
      // console.log('the data is ', response.data?.information?.doctors)
      return response.data?.information?.doctors;
    } catch (error) {
      if (error.response) {
        return rejectWithValue(error.response.data.message || 'Failed to fetch doctors');
      }
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDoctorById = createAsyncThunk(
  'doctor/fetchDoctorById',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/doctor/get-doctor-by-id/${doctorId}`, {
        headers: getAuthHeader(),
      });
      // console.log("the data in doctor by id is ", response.data?.information?.doctor)
      // console.log("the data in patient by id is ", response.data?.information)
      return {
        doctor: response.data?.information?.doctor,
        patients: response.data?.information?.patients
      }
    } catch (error) {
      if (error.response) {
        return rejectWithValue(error.response.data.message || 'Failed to fetch doctor by ID');
      }
      return rejectWithValue(error.message);
    }
  }
);

export const updateDoctorById = createAsyncThunk(
  'doctor/updateDoctorById',
  async ({ doctorId, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/doctor/update-doctor/${doctorId}`,
        updatedData,
        { headers: getAuthHeader() }
      );
      return response.data.updatedDoctor;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update doctor';
      return rejectWithValue({ message, statusCode: error.response?.status || 500 });
    }
  }
);

export const deleteDoctorById = createAsyncThunk(
  'doctor/deleteDoctorById',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `${API_URL}/doctor/delete/${doctorId}`,
        { headers: getAuthHeader() }
      );
      return response.data; // Assuming your API returns this
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete doctor';
      return rejectWithValue({ message, statusCode: error.response?.status || 500 });
    }
  }
);

export const fetchDoctorsByDepartmentName = createAsyncThunk(
  'doctor/fetchDoctorsByDepartmentName',
  async (departmentName, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/doctor/get-doctors-by-department/${departmentName}`, {
        headers: getAuthHeader(),
      });
      return response.data.data.doctors
    } catch (error) {
      if (error.response) {
        return rejectWithValue(error.response.data.message || 'Failed to fetch doctors by department');
      }
      return rejectWithValue(error.message);
    }
  })

const initialState = {
  doctors: [],
  patients: [],
  isLoading: false,
  isError: false,
  errorMessage: '',
  currentDoctor: null,
  currentDepartment: null,
  status: 'idle' // 'idle' | 'loading' | 'succeeded' | 'failed'
};

const doctorSlice = createSlice({
  name: 'doctor',
  initialState,
  reducers: {
    resetDoctorState: () => initialState,
    setDoctors: (state, action) => {
      state.doctors = action.payload;
    },
    clearErrors: (state) => {
      state.isError = false;
      state.errorMessage = '';
    }
  },
  extraReducers: (builder) => {
    builder
      // createDoctor thunk 
      .addCase(createDoctor.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(createDoctor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = 'succeeded';
        // state.doctors = action.payload.information.doctors;
        if (action.payload.data?.doctor) {
          state.doctors.push(action.payload.data.doctor);
        }
      })
      .addCase(createDoctor.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload;
      })
      // fetchAllDoctors thunk
      .addCase(fetchAllDoctors.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(fetchAllDoctors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.doctors = action.payload;
        //  console.log('the data in case ', action.payload)
      })
      .addCase(fetchAllDoctors.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload;
      })
      // fetchDoctorById thunk
      .addCase(fetchDoctorById.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(fetchDoctorById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDoctor = action.payload?.doctor || null;
        state.patients = action.payload?.patients || [];
        // console.log('the patient in state', action.payload)
      })
      .addCase(fetchDoctorById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload;
      })
      // updateDoctorById thunk
      .addCase(updateDoctorById.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(updateDoctorById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = 'succeeded';
        const updatedDoctor = action.payload;
        const index = state.doctors.findIndex((doctor) => doctor._id === updatedDoctor._id);
        if (index !== -1) {
          state.doctors[index] = updatedDoctor;
        }
      })
      .addCase(updateDoctorById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload.message || 'Failed to update doctor';
      })
      // deleteDoctorById thunk
      .addCase(deleteDoctorById.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(deleteDoctorById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.doctors = state.doctors.filter(
          doctor => doctor._id !== action.payload.information?.doctorId
        );
      })
      .addCase(deleteDoctorById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload.message || 'Failed to delete doctor';
      })
      // fetchDoctorsByDepartmentName  thunk
      .addCase(fetchDoctorsByDepartmentName.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.status = 'loading';
      })
      .addCase(fetchDoctorsByDepartmentName.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.doctors = action.payload || [];
      })
      .addCase(fetchDoctorsByDepartmentName.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.status = 'failed';
        state.errorMessage = action.payload;
      });
  },
});

export const {
  resetDoctorState,
  setDoctors,
  clearErrors
} = doctorSlice.actions;

export default doctorSlice.reducer;
