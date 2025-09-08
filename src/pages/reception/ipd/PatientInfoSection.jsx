import React from "react";
import { FormSection, FormGrid } from "../../../components/common/FormSection";
import { InputField } from "../../../components/common/FormFields";

const PatientInfoSection = ({ formData, handleChange, bloodGroups }) => {
  const fieldConfig = [
    {
      name: "mrNumber", label: "MR Number", type: "text", icon: "idCard", placeholder: "Enter MR Number", required: true, readOnly: true
    },
    {
      name: "patientName", label: "Patient Name", type: "text", icon: "user", placeholder: "Enter Patient Name", required: true, readOnly: true
    },
    {
      name: "guardianName", label: "Guardian Name", type: "text", icon: "team", placeholder: "Enter Guardian Name", required: true, readOnly: true
    },
    {
      name: "guardianRelation", label: "Guardian Relation", type: "select", icon: "team", options: ["Father", "Mother", "Sibling", "Spouse", "Uncle", "Aunt", "Grandfather", "Grandmother", "Other"], readOnly: true
    },
    {
      name: "dob", label: "Date of Birth", type: "date", icon: "calendar", readOnly: true
    },
    {
      name: "cnic", label: "CNIC Number", type: "text", icon: "idCard", placeholder: "XXXXX-XXXXXXX-X", readOnly: true
    },
    {
      name: "age", label: "Age", type: "text", icon: "number", placeholder: "Enter Age", readOnly: true
    },
    {
      name: "patientContactNo", label: "Patient Contact", type: "tel", icon: "number", placeholder: "03XX-XXXXXXX", required: true,
      readOnly: true
    },
    {
      name: "guardianContact", label: "Guardian Contact", type: "tel", icon: "number", placeholder: "03XX-XXXXXXX", readOnly: true
    },
    {
      name: "address", label: "Address", type: "text", icon: "home", placeholder: "Enter Full Address", fullWidth: true
    },
    {
      name: "gender", label: "Gender", type: "select", icon: "man", options: ["Male", "Female"],
      required: true
    },
    {
      name: "maritalStatus", label: "Marital Status", type: "select", icon: "ring", options: ["Single", "Married", "Divorced", "Widowed"]
    },
    {
      name: "bloodGroup", label: "Blood Group", type: "select", icon: "heartbeat", options: bloodGroups
    },
    {
      name: "referredBy", label: "Referred By", type: "text", icon: "health", placeholder: "Enter Referral Name (if any)", fullWidth: true
    }
  ];

  return (
    <FormSection title="Patient Information">
      <FormGrid>
        {fieldConfig.map((field) => (
          <InputField
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            value={formData[field.name]}
            onChange={handleChange}
            icon={field.icon}
            placeholder={field.placeholder}
            required={field.required}
            options={field.options}
            readOnly={field.readOnly}
            fullWidth={field.fullWidth}
          />
        ))}
      </FormGrid>
    </FormSection>
  );
};

export default PatientInfoSection;