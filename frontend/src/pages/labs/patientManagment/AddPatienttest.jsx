import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, ButtonGroup } from '../../../components/common/Buttons';
import { FormSection } from '../../../components/common/FormSection';
import ReactDOMServer from 'react-dom/server';
import PrintA4 from './PrintPatientTest';
import {
  fetchAllTests,
  SubmitPatientTest,
  fetchPatientByMRNo,
  resetPatientTestStatus,
} from '../../../features/patientTest/patientTestSlice';
import PatientInfoForm from './PatientIno';
import TestInformationForm from './TestInfo';
import { toast } from 'react-toastify';

const AddlabPatient = () => {
  const dispatch = useDispatch();
  const {
    patient: patientAll,
    loading,
    error,
  } = useSelector((state) => state.patientTest);
  const testList = useSelector((state) => state.patientTest.tests);

  const [isPrinting, setIsPrinting] = useState(false);
  const [mode, setMode] = useState('existing');

  const [patient, setPatient] = useState({
    id: '',
    MRNo: '',
    CNIC: '',
    Name: '',
    ContactNo: '',
    Gender: '',
    Age: '',
    ReferredBy: '',
    Guardian: '',
  });

  const [selectedTestId, setSelectedTestId] = useState('');
  const [testRows, setTestRows] = useState([]);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [dob, setDob] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [useDefaultContact, setUseDefaultContact] = useState(false);
  const [defaultContactNumber] = useState('0000-0000000');
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAllTests());
    return () => dispatch(resetPatientTestStatus());
  }, [dispatch]);

  // default contact toggle
  useEffect(() => {
    if (useDefaultContact) {
      setPatient((prev) => ({ ...prev, ContactNo: defaultContactNumber }));
    } else if (patient.ContactNo === defaultContactNumber) {
      setPatient((prev) => ({ ...prev, ContactNo: '' }));
    }
  }, [useDefaultContact, defaultContactNumber]); // eslint-disable-line

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const dob = new Date(birthDate);
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} years ${months} months ${days} days`;
  };

  const handleDobChange = (date) => {
    setDob(date);
    setPatient((prev) => ({ ...prev, Age: calculateAge(date) }));
  };

  const handlePatientChange = (e) => {
    const { name, value } = e.target;
    if (
      (name === 'CNIC' && value.length > 13) ||
      (name === 'ContactNo' && value.length > 15)
    )
      return;
    setPatient({ ...patient, [name]: value });
  };

  const handleSearch = async () => {
    const mrNo = patient.MRNo?.trim();
    if (!mrNo) {
      alert('Please enter MR No.');
      return;
    }

    try {
      const patientData = await dispatch(fetchPatientByMRNo(mrNo)).unwrap();
      if (!patientData) {
        alert('Patient not found.');
        return;
      }

      if (!patientData.contactNo || patientData.contactNo.trim() === '') {
        setUseDefaultContact(true);
      }

      setPatient({
        MRNo: patientData.mrno || '',
        CNIC: patientData.cnic || '',
        Name: patientData.name || '',
        patient_Guardian: patientData.patient_Guardian || '',
        ContactNo: patientData.contactNo || '',
        Gender: patientData.gender || '',
        Age: patientData.age || calculateAge(patientData.DateOfBirth) || '',
        ReferredBy: patientData.referredBy || '',
        Guardian: patientData.gaurdian || '',
      });
    } catch (err) {
      console.error('❌ Patient not found:', err);
      alert(err.payload?.message || 'Patient not found. Please check MR No.');
    }
  };

  const handleTestAdd = (tId) => {
    const id = tId ?? selectedTestId;
    if (!id) return;
    const selected = testList.find((t) => t._id === id);
    if (!selected) return;

    const today = new Date().toISOString().split('T')[0];

    setTestRows((prev) => [
      ...prev,
      {
        testId: selected._id,
        testName: selected.testName,
        testCode: selected.testCode,
        quantity: prev.length + 1,
        sampleDate: today,
        reportDate: today,
        amount: Number(selected.testPrice) || 0,
        discount: 0,
        finalAmount: Number(selected.testPrice) || 0,
        paid: 0,
        notes: '',
      },
    ]);
    setSelectedTestId('');
  };

  const handleTestRowChange = (i, field, value) => {
    const rows = [...testRows];
    const val = field === 'notes' ? value : Math.max(0, Number(value));

    if (['amount', 'discount', 'paid'].includes(field)) {
      rows[i][field] = val;

      if (field === 'amount' || field === 'discount') {
        rows[i].finalAmount = Math.max(0, rows[i].amount - rows[i].discount);
      }
      if (field === 'paid') {
        rows[i].paid = Math.min(val, rows[i].finalAmount);
      }
    } else {
      rows[i][field] = value;
    }

    setTestRows(rows);
  };

  const handleRemoveRow = (i) => {
    const updatedRows = testRows.filter((_, idx) => idx !== i);
    const reNumbered = updatedRows.map((row, idx) => ({
      ...row,
      quantity: idx + 1,
    }));
    setTestRows(reNumbered);
  };

  // totals
  const totalAmount = testRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalDiscount = testRows.reduce((sum, r) => sum + (r.discount || 0), 0);
  const totalFinalAmount = testRows.reduce(
    (sum, r) => sum + (r.finalAmount || 0),
    0
  );
  const totalPaid = testRows.reduce((sum, r) => sum + (r.paid || 0), 0);
  const overallRemaining = Math.max(0, totalFinalAmount - totalPaid);

  const showPopupBlockerWarning = () => {
    const existing = document.querySelector('.popup-blocker-warning');
    if (existing) return;
    const warning = document.createElement('div');
    warning.className = 'popup-blocker-warning';
    warning.style = `
      position: fixed; top: 20px; right: 20px; padding: 15px;
      background: #ffeb3b; border: 1px solid #ffc107; border-radius: 4px; z-index: 9999;
    `;
    warning.innerHTML = `
      <p>Popup blocked! Please allow popups for this site.</p>
      <button onclick="this.parentNode.remove()">Dismiss</button>
    `;
    document.body.appendChild(warning);
  };

  const handlePrint = (dataForPrint) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showPopupBlockerWarning();
      setPrintData(dataForPrint);
      return;
    }

    const printContent = ReactDOMServer.renderToStaticMarkup(
      <PrintA4 formData={dataForPrint} />
    );

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Patient Test</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
          <style>
            body { font-family: Arial, sans-serif; padding: 10mm; color: #333; font-size: 14px; }
            .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .logo { height: 60px; margin-right: 20px; }
          </style>
        </head>
        <body>${printContent}</body>
        <script>
          setTimeout(() => {
            window.print();
            window.onafterprint = function() { window.close(); };
          }, 500);
        </script>
      </html>
    `);
    printWindow.document.close();
  };

  const submitForm = async (shouldPrint) => {
    if (!testRows.length) {
      alert('Please add at least one test');
      return;
    }

    const payload = {
      patient_MRNo: patient.MRNo,
      patient_CNIC: patient.CNIC,
      patient_Name: patient.Name,
      patient_Guardian: patient.Guardian,
      patient_ContactNo: patient.ContactNo,
      patient_Gender: patient.Gender,
      patient_Age: patient.Age,
      referredBy: patient.ReferredBy,
      isExternalPatient: mode === 'new',
      selectedTests: testRows.map((row) => ({
        test: row.testId,
        testPrice: row.amount,
        discountAmount: row.discount,
        advanceAmount: row.paid,
        remainingAmount: row.finalAmount - row.paid,
        sampleDate: row.sampleDate,
        reportDate: row.reportDate,
        notes: row.notes || '',
      })),
      totalAmount,
      advanceAmount: totalPaid,
      remainingAmount: overallRemaining,
      totalPaid: totalPaid,
      performedBy: '',
    };

    try {
      setIsPrinting(true);
      const result = await dispatch(SubmitPatientTest(payload)).unwrap();
      toast.success('Data saved successfully!');
      if (!result) throw new Error('Submission failed - no data returned');
      setSubmissionResult(result);

      if (shouldPrint) {
        const dataForPrint = {
          tokenNumber: result.tokenNumber,
          patient: {
            MRNo: result.patient?.mrNo || patient.MRNo,
            Name: patient.Name,
            CNIC: patient.CNIC,
            ContactNo: patient.ContactNo,
            Gender: patient.Gender,
            Age: patient.Age,
            ReferredBy: patient.ReferredBy,
            Guardian: patient.patient_Guardian,
          },
          tests: testRows,
          totalAmount,
          totalDiscount,
          totalFinalAmount,
          totalPaid,
          remaining: overallRemaining,
          sampleDate: testRows[0]?.sampleDate,
          reportDate: testRows[0]?.reportDate,
          referredBy: patient.ReferredBy,
        };
        handlePrint(dataForPrint);
      }

      // reset form
      setPatient({
        MRNo: '',
        CNIC: '',
        Name: '',
        ContactNo: '',
        Gender: '',
        Age: '',
        ReferredBy: '',
        Guardian: '',
      });
      setTestRows([]);
      setDob(null);
      setUseDefaultContact(false);
      setSelectedTestId('');
      setPrintData(null);
      setFormKey((k) => k + 1);
    } catch (err) {
      console.error('❌ Submission error:', err);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSubmitOnly = async (e) => {
    e.preventDefault();
    await submitForm(false);
  };

  const handleSubmitAndPrint = async (e) => {
    e.preventDefault();
    await submitForm(true);
  };

  // keyboard nav
  const handleKeyDown = (e) => {
    const form = formRef.current;
    if (!form) return;
    const inputs = Array.from(
      form.querySelectorAll('input, select, textarea')
    ).filter((el) => el.type !== 'hidden' && !el.disabled);
    const index = inputs.indexOf(e.target);
    if (index === -1) return;

    if (['Enter', 'ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (index < inputs.length - 1) inputs[index + 1].focus();
    }
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      if (index > 0) inputs[index - 1].focus();
    }
  };

  // helpers used by the discount/paid appliers
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // A) Apply overall discount proportionally to rows (no setBilling/setMeta)
  const applyOverallDiscount = (requestedDiscount) => {
    const rows = [...testRows];
    if (rows.length === 0) return;

    const amounts = rows.map((r) => Math.max(0, toNum(r.amount)));
    const totalAmountLocal = amounts.reduce((s, n) => s + n, 0);

    // clamp requested overall discount to total amount
    let remaining = Math.min(
      Math.max(0, toNum(requestedDiscount)),
      totalAmountLocal
    );

    // if nothing to apply, still normalize rows
    if (totalAmountLocal === 0 || remaining === 0) {
      const fixed = rows.map((r, i) => {
        const amount = amounts[i];
        const discount = Math.min(amount, Math.max(0, toNum(r.discount)));
        const final = round2(Math.max(0, amount - discount));
        const paid = round2(Math.min(toNum(r.paid), final));
        return {
          ...r,
          amount,
          discount,
          finalAmount: final,
          paid,
          remaining: round2(final - paid),
        };
      });
      setTestRows(fixed);
      return;
    }

    // 1) proportional targets
    const targets = amounts.map((a) =>
      totalAmountLocal > 0 ? (remaining * a) / totalAmountLocal : 0
    );

    // 2) initial assignment with caps
    const discounts = new Array(rows.length).fill(0);
    let assigned = 0;
    for (let i = 0; i < rows.length; i++) {
      const cap = amounts[i];
      const want = round2(targets[i]);
      const give = Math.min(cap, want);
      discounts[i] = give;
      assigned += give;
    }

    // 3) reflow leftover in 0.01 steps
    let leftover = round2(remaining - assigned);
    while (leftover > 0.000001) {
      let progressed = false;
      for (let i = 0; i < rows.length && leftover > 0.000001; i++) {
        const room = round2(amounts[i] - discounts[i]);
        if (room <= 0.000001) continue;
        const give = round2(Math.min(room, leftover, 0.01));
        discounts[i] = round2(discounts[i] + give);
        leftover = round2(leftover - give);
        progressed = true;
      }
      if (!progressed) break;
    }

    // 4) update rows
    const out = rows.map((r, i) => {
      const amount = amounts[i];
      const discount = Math.min(amount, round2(discounts[i]));
      const final = round2(Math.max(0, amount - discount));
      const paid = round2(Math.min(toNum(r.paid), final)); // clamp paid to new final
      const rem = round2(final - paid);
      return {
        ...r,
        amount,
        discount,
        finalAmount: final,
        paid,
        remaining: rem,
      };
    });

    setTestRows(out);
  };

  // B) Apply overall paid across rows (first→last)
  const applyOverallPaid = (overallPaidRaw) => {
    const overallPaid = Math.max(0, Number(overallPaidRaw) || 0);

    setTestRows((prev) => {
      const rows = prev.map((r) => {
        const amount = Math.max(0, Number(r.amount) || 0);
        const discount = Math.min(amount, Math.max(0, Number(r.discount) || 0));
        const finalAmount = Math.max(0, amount - discount);
        return { ...r, finalAmount, paid: 0 };
      });

      let remaining = overallPaid;

      const next = rows.map((r) => {
        if (remaining <= 0 || r.finalAmount === 0) return r;
        const payNow = Math.min(r.finalAmount, remaining);
        remaining -= payNow;
        return {
          ...r,
          paid: round2(payNow),
          remaining: round2(r.finalAmount - payNow),
        };
      });

      return next;
    });
  };

  return (
    <form
      onSubmit={handleSubmitOnly}
      ref={formRef}
      onKeyDown={handleKeyDown}
      className="p-6 bg-white rounded shadow-md space-y-10"
    >
      <div className="w-screen -ml-6 bg-teal-600 py-6 text-white text-3xl font-bold shadow">
        <h1 className="ml-4">Add Patient New Test</h1>
      </div>

      <FormSection
        title="Patient Information"
        bgColor="bg-primary-700 text-white"
      >
        <PatientInfoForm
          key={`pinfo-${formKey}`}
          mode={mode}
          patient={patient}
          dob={dob}
          handlePatientChange={handlePatientChange}
          handleSearch={handleSearch}
          handleDobChange={handleDobChange}
          setMode={setMode}
          useDefaultContact={useDefaultContact}
          setUseDefaultContact={setUseDefaultContact}
          defaultContactNumber={defaultContactNumber}
        />
      </FormSection>

      <FormSection title="Test Information" bgColor="bg-primary-700 text-white">
        <TestInformationForm
          key={`tinfo-${formKey}`}
          testList={testList}
          selectedTestId={selectedTestId}
          setSelectedTestId={setSelectedTestId}
          testRows={testRows}
          handleTestAdd={handleTestAdd}
          handleTestRowChange={handleTestRowChange}
          handleRemoveRow={handleRemoveRow}
          totalAmount={totalAmount}
          totalDiscount={totalDiscount}
          totalFinalAmount={totalFinalAmount}
          totalPaid={totalPaid}
          overallRemaining={overallRemaining}
          applyOverallPaid={applyOverallPaid}
          applyOverallDiscount={applyOverallDiscount}
          // ✅ keep the child inputs in sync with current totals
          paidBoxValue={totalPaid}
          discountBoxValue={totalDiscount}
          mode={mode}
        />
      </FormSection>

      <ButtonGroup className="justify-end">
        <Button type="reset" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPrinting}>
          {isPrinting ? 'Submitting...' : 'Submit'}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={isPrinting}
          onClick={handleSubmitAndPrint}
        >
          {isPrinting ? 'Processing...' : 'Submit & Print'}
        </Button>
      </ButtonGroup>

      {printData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Print Preview</h2>
              <div className="space-x-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    window.print();
                    setPrintData(null);
                  }}
                >
                  Print Now
                </Button>
                <Button variant="secondary" onClick={() => setPrintData(null)}>
                  Close
                </Button>
              </div>
            </div>
            <PrintA4 formData={printData} />
          </div>
        </div>
      )}
    </form>
  );
};

export default AddlabPatient;
