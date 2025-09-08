// components/PrintButton.jsx
import React, { useState } from 'react';
import { AiOutlinePrinter } from 'react-icons/ai';
import { handlePrint } from '../../../../utils/printUtils';

const PrintButton = ({ patient }) => {
   const [showPrintOptions, setShowPrintOptions] = useState(false);
   const [printOption, setPrintOption] = useState('');

   const handlePrintClick = () => {
      setShowPrintOptions(true);
   };

   const handlePrintConfirm = () => {
      if (!printOption) {
         alert('Please select a print option');
         return;
      }

      // Prepare formData structure that printUtils expects
      const formData = {
         patient_MRNo: patient.patient_MRNo,
         patient_Name: patient.patient_Name,
         patient_ContactNo: patient.patient_ContactNo,
         patient_Guardian: patient.patient_Guardian,
         patient_CNIC: patient.patient_CNIC,
         patient_Gender: patient.patient_Gender,
         patient_Age: patient.patient_Age,
         patient_DateOfBirth: patient.patient_DateOfBirth,
         patient_Address: patient.patient_Address,
         patient_BloodType: patient.patient_BloodType,
         patient_MaritalStatus: patient.patient_MaritalStatus,
         visitData: {
            doctor: patient.visits?.[0]?.doctor?._id || '',
            purpose: patient.visits?.[0]?.purpose || '',
            disease: patient.visits?.[0]?.disease || '',
            discount: patient.visits?.[0]?.discount || 0,
            referredBy: patient.visits?.[0]?.referredBy || '',
            amountPaid: patient.visits?.[0]?.amountPaid || 0,
            paymentMethod: patient.visits?.[0]?.paymentMethod || 'cash',
            amountStatus: patient.visits?.[0]?.amountStatus || 'cash',
            verbalConsentObtained: patient.visits?.[0]?.verbalConsentObtained || false,
            token: patient.visits?.[0]?.token || '',
            notes: patient.visits?.[0]?.notes || ''
         },
         doctorDetails: {
            name: patient.visits?.[0]?.doctor?.user?.user_Name || '',
            gender: patient.visits?.[0]?.doctor?.doctor_Gender || '',
            qualification: Array.isArray(patient.visits?.[0]?.doctor?.doctor_Qualifications)
               ? patient.visits?.[0]?.doctor?.doctor_Qualifications.join(", ")
               : patient.visits?.[0]?.doctor?.doctor_Qualifications || "",
            fee: patient.visits?.[0]?.doctor?.doctor_Fee || 0,
            specialization: patient.visits?.[0]?.doctor?.doctor_Specialization || "",
            department: patient.visits?.[0]?.doctor?.doctor_Department || ""
         }
      };

      handlePrint(formData, printOption);
      setShowPrintOptions(false);
      setPrintOption('');
   };

   return (
      <>
         {/* Big Card Style Button */}
         <button
            onClick={handlePrintClick}
            className="text-sky-600 border border-sky-200 hover:text-sky-900 p-1 rounded-md hover:bg-sky-50"
            aria-label={`Print ${patient.patient_Name}`}
         >
            <AiOutlinePrinter className="h-5 w-5" />
         </button>
         
         {showPrintOptions && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center z-50 p-4">
               <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                  <h3 className="text-xl font-bold mb-6 text-center text-gray-800">Print Options for {patient.patient_Name}</h3>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                     <div
                        className={`border-2 rounded-xl p-4 flex items-center cursor-pointer transition-all ${printOption === 'thermal' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                        onClick={() => setPrintOption('thermal')}
                     >
                        <div className="bg-primary-100 p-3 rounded-full mr-4">
                           <AiOutlinePrinter className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                           <div className="font-medium text-gray-800">Thermal Slip</div>
                           <div className="text-sm text-gray-500">Small receipt format</div>
                        </div>
                        <div className="ml-auto">
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${printOption === 'thermal' ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                              {printOption === 'thermal' && <div className="h-3 w-3 rounded-full bg-white"></div>}
                           </div>
                        </div>
                     </div>

                     <div
                        className={`border-2 rounded-xl p-4 flex items-center cursor-pointer transition-all ${printOption === 'a4' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                        onClick={() => setPrintOption('a4')}
                     >
                        <div className="bg-primary-100 p-3 rounded-full mr-4">
                           <AiOutlinePrinter className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                           <div className="font-medium text-gray-800">A4 Form</div>
                           <div className="text-sm text-gray-500">Standard paper format</div>
                        </div>
                        <div className="ml-auto">
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${printOption === 'a4' ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                              {printOption === 'a4' && <div className="h-3 w-3 rounded-full bg-white"></div>}
                           </div>
                        </div>
                     </div>

                     <div
                        className={`border-2 rounded-xl p-4 flex items-center cursor-pointer transition-all ${printOption === 'pdf' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                        onClick={() => setPrintOption('pdf')}
                     >
                        <div className="bg-primary-100 p-3 rounded-full mr-4">
                           <AiOutlinePrinter className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                           <div className="font-medium text-gray-800">PDF Document</div>
                           <div className="text-sm text-gray-500">Digital format</div>
                        </div>
                        <div className="ml-auto">
                           <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${printOption === 'pdf' ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                              {printOption === 'pdf' && <div className="h-3 w-3 rounded-full bg-white"></div>}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                     <button
                        onClick={() => {
                           setShowPrintOptions(false);
                           setPrintOption('');
                        }}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                     >
                        Cancel
                     </button>

                     <button
                        onClick={handlePrintConfirm}
                        disabled={!printOption}
                        className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${printOption ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                     >
                        Print Now
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
};

export default PrintButton;