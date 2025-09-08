import React from 'react';
import Select from 'react-select';
import { FaUserMd } from "react-icons/fa";

const DoctorSelect = ({
   doctorsStatus,
   doctorOptions,
   selectedDoctor,
   onDoctorChange,
   mode = "create" // Add mode prop with default value
}) => {
   // Determine if the select should be disabled
   const isDisabled = doctorsStatus === 'loading' || mode === 'edit';

   return (
      <div className="space-y-1 mb-6">
         <label className="block text-sm font-medium text-gray-700">
            Consulting Doctor
         </label>
         <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
               <FaUserMd className="text-primary-600" />
            </div>
            <Select
               required={true}
               options={doctorOptions}
               value={selectedDoctor}
               onChange={onDoctorChange}
               className="react-select-container"
               classNamePrefix="react-select"
               placeholder="Select Doctor"
               isDisabled={isDisabled} // Use the combined disabled state
               isLoading={doctorsStatus === 'loading'}
               isClearable={mode !== 'edit'} // Disable clear in edit mode
               noOptionsMessage={() =>
                  doctorsStatus === 'loading' ? 'Loading doctors...' : 'No doctors found'
               }
               styles={{
                  control: (base) => ({
                     ...base,
                     paddingLeft: '40px',
                     minHeight: '44px',
                     // Additional styles for read-only appearance in edit mode
                     ...(mode === 'edit' && {
                        backgroundColor: '#f9fafb',
                        borderColor: '#e5e7eb',
                        cursor: 'not-allowed'
                     })
                  }),
                  // Make the value container appear as read-only text
                  ...(mode === 'edit' && {
                     singleValue: (base) => ({
                        ...base,
                        color: '#374151'
                     })
                  })
               }}
            />
         </div>
         {/* Show a message in edit mode explaining why it's read-only */}
         {mode === 'edit' && (
            <p className="text-xs text-gray-500 mt-1">
               Doctor selection cannot be changed in edit mode
            </p>
         )}
      </div>
   );
};

export default DoctorSelect;