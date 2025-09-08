import React, { useState, useEffect } from 'react';
import { InputField } from '../../../components/common/FormFields';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import doctorList from '../../../utils/doctors';

const PatientInfoForm = ({
  mode,
  patient,
  dob,
  handlePatientChange,
  handleSearch,
  handleDobChange,
  setMode,
  useDefaultContact,
  setUseDefaultContact,
  defaultContactNumber,
}) => {
  const [ageInput, setAgeInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Calculate DOB from age input
  const calculateDobFromAge = (ageString) => {
    if (!ageString) return null;

    const today = new Date();
    const ageParts = ageString.toLowerCase().split(' ');

    let years = 0;
    let months = 0;
    let days = 0;

    // Handle decimal input like "0.2" (meaning 0.2 years = 2.4 months ≈ 2 months)
    if (ageString.includes('.')) {
      const decimalValue = parseFloat(ageString);
      if (!isNaN(decimalValue)) {
        if (decimalValue < 1) {
          // If less than 1 year, treat as months
          months = Math.round(decimalValue * 12);
        } else {
          // If 1 or more years, split into years and months
          years = Math.floor(decimalValue);
          months = Math.round((decimalValue - years) * 12);
        }
      }
    } else {
      // Parse age string (e.g., "20 years", "2 months", "1 year 6 months")
      for (let i = 0; i < ageParts.length; i++) {
        if (ageParts[i] === 'year' || ageParts[i] === 'years') {
          years = parseInt(ageParts[i - 1]) || 0;
        } else if (ageParts[i] === 'month' || ageParts[i] === 'months') {
          months = parseInt(ageParts[i - 1]) || 0;
        } else if (ageParts[i] === 'day' || ageParts[i] === 'days') {
          days = parseInt(ageParts[i - 1]) || 0;
        }
      }

      // If it's just a number, assume it's years
      if (!isNaN(ageString) && years === 0 && months === 0 && days === 0) {
        years = parseInt(ageString);
      }
    }

    // Calculate DOB
    const calculatedDob = new Date(today);
    calculatedDob.setFullYear(today.getFullYear() - years);
    calculatedDob.setMonth(today.getMonth() - months);
    calculatedDob.setDate(today.getDate() - days);

    return calculatedDob;
  };

  // Handle age input change with debounce
  const handleAgeChange = (e) => {
    const value = e.target.value;
    setAgeInput(value);
    setIsTyping(true);

    // Clear any existing timeout
    if (window.ageInputTimeout) {
      clearTimeout(window.ageInputTimeout);
    }

    // Set a new timeout to process the input after user stops typing
    window.ageInputTimeout = setTimeout(() => {
      setIsTyping(false);

      if (value.trim() === '') {
        handleDobChange(null);
        return;
      }

      const calculatedDob = calculateDobFromAge(value);
      if (calculatedDob) {
        handleDobChange(calculatedDob);
      }
    }, 800); // 800ms delay
  };

  // Update age input when DOB changes externally
  useEffect(() => {
    if (dob && mode === 'new' && !isTyping) {
      // Calculate age from DOB for display
      const today = new Date();
      const birthDate = new Date(dob);

      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();

      if (days < 0) {
        months--;
        days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      let ageString = '';
      if (years > 0) ageString += `${years} year${years !== 1 ? 's' : ''} `;
      if (months > 0) ageString += `${months} month${months !== 1 ? 's' : ''} `;
      if (days > 0 && years === 0)
        ageString += `${days} day${days !== 1 ? 's' : ''}`;

      setAgeInput(ageString.trim());
    }
  }, [dob, mode, isTyping]);
  // 1) Put this helper near the top of the file (inside or above the component)
  const RequiredLabel = ({ children, required }) => (
    <label className="block mb-1 font-medium text-gray-700">
      {required && <span className="text-red-500">*</span>} {children}
    </label>
  );

  // Common fields that appear in both modes
  const commonFields = (
    <>
      <InputField
        name="Name"
        label="Name"
        placeholder="Enter full name"
        icon="user"
        value={patient.Name}
        onChange={handlePatientChange}
        required
      />
      <InputField
        name="CNIC"
        label="CNIC"
        placeholder="Enter CNIC"
        icon="idCard"
        value={patient.CNIC}
        onChange={handlePatientChange}
      />
      <InputField
        name="Guardian"
        label="Guardian Name"
        placeholder="Enter full name"
        icon="user"
        value={patient.Guardian}
        onChange={handlePatientChange}
      />

      <div>
        <label
          htmlFor="Gender"
          className="block mb-1 font-medium text-gray-700"
        >
          Gender<span className="text-red-500"> *</span>
        </label>
        <select
          id="Gender"
          name="Gender"
          value={patient.Gender || ''}
          onChange={handlePatientChange}
          className="border h-[42px] p-2 rounded w-full"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="flex items-center ">
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="useDefaultContact"
            checked={useDefaultContact}
            onChange={(e) => setUseDefaultContact(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="useDefaultContact" className="text-sm text-gray-600">
            Use default contact number ({defaultContactNumber})
          </label>
        </div>
      </div>

      <InputField
        name="ContactNo"
        label="Contact No"
        placeholder="Enter Contact No"
        icon="phone"
        value={patient.ContactNo}
        onChange={handlePatientChange}
        required
      />

      <div>
        <label
          htmlFor="ReferredBy"
          className="block mb-1 font-medium text-gray-700"
        >
          Referred By
        </label>
        <select
          id="ReferredBy"
          name="ReferredBy"
          value={patient.ReferredBy || ''}
          onChange={handlePatientChange}
          className="border h-[42px] p-2 rounded w-full"
        >
          <option value="">Select Doctor</option>
          {doctorList.map((doctor, index) => (
            <option key={index} value={doctor}>
              {doctor}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  // Fields specific to existing patient mode
  const existingPatientFields = (
    <div className="col-span-3 flex gap-2 items-end">
      <InputField
        name="MRNo"
        label="MR Number"
        placeholder="MR-NO"
        icon="idCard"
        value={patient.MRNo}
        onChange={handlePatientChange}
        required
      />
      <button
        type="button"
        className="px-4 py-2 bg-primary-700 text-white rounded h-[42px]"
        onClick={handleSearch}
      >
        Search
      </button>
    </div>
  );

  // Fields specific to new patient mode
  const newPatientFields = (
    <>
      <div className="grid grid-cols-2 gap-4 col-span-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={dob}
            onChange={handleDobChange}
            dateFormat="yyyy-MM-dd"
            showMonthDropdown
            maxDate={new Date()}
            showYearDropdown
            dropdownMode="select"
            placeholderText="Select DOB"
            className="border rounded px-3 py-2 h-[42px] w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Age (auto-calculates DOB)<span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            placeholder="e.g., 20, 0.2, 2 months, 1.5"
            value={ageInput}
            onChange={handleAgeChange}
            className="border rounded px-3 py-2 h-[42px] w-full"
          />{' '}
          <p className="text-xs text-gray-500 mt-1">
            Enter numbers: 20 (years), 0.2 (2 months), 1.5 (1 year 6 months)
          </p>
        </div>
      </div>

      <InputField
        name="Age"
        label="Age (Display Only)"
        icon="calendar"
        placeholder="Age display"
        value={patient.Age}
        onChange={handlePatientChange}
        readOnly
      />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <button
          type="button"
          className={`px-4 py-2 rounded ${
            mode === 'existing' ? 'bg-primary-700 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setMode('existing')}
        >
          Existing
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded ${
            mode === 'new' ? 'bg-primary-700 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setMode('new')}
        >
          New
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {mode === 'existing' && existingPatientFields}

        {commonFields}

        {/* Age field for existing patients (placed after common fields) */}
        {mode === 'existing' && (
          <InputField
            name="Age"
            label="Age"
            icon="calendar"
            placeholder="Age auto Generated"
            value={patient.Age}
            onChange={handlePatientChange}
            readOnly
          />
        )}

        {mode === 'new' && newPatientFields}
      </div>
    </div>
  );
};

export default PatientInfoForm;
