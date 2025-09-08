import React from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';

const TestInformationForm = ({
  testList,
  selectedTestId,
  setSelectedTestId,
  testRows,
  handleTestAdd,
  handleTestRowChange,
  handleRemoveRow,
  totalAmount,
  totalDiscount,
  totalPaid,
  overallRemaining,
  applyOverallDiscount,
  applyOverallPaid,
  mode,
  // NEW: show current totals from Edit screen
  paidBoxValue, // = advanceAmount (sum of per-row paid)
  discountBoxValue, // = discountAmount (sum of per-row discount)
}) => {
  // --- helpers for decimals ---
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Parse, clamp to [0..max], and round to 2 decimals
  const asMoney = (v, max = 9_999_999.99) => {
    const n = toNum(v);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(round2(n), 0), max);
  };

  const fmt = (v) => {
    const n = toNum(v);
    return Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : '—';
  };

  // Safely normalize testList to always be an array
  const normalizedTestList = Array.isArray(testList) ? testList : [];
  const isLoadingTests = testList === undefined;
  const noTestsAvailable = Array.isArray(testList) && testList.length === 0;

  // Controlled inputs for totals (these will mirror parent totals)
  const [paidBox, setPaidBox] = React.useState('');
  const [discountBox, setDiscountBox] = React.useState('');

  // Keep the boxes in sync with parent totals (Edit view)
  React.useEffect(() => {
    if (paidBoxValue !== undefined && paidBoxValue !== null) {
      setPaidBox(String(paidBoxValue));
    }
  }, [paidBoxValue]);

  React.useEffect(() => {
    if (discountBoxValue !== undefined && discountBoxValue !== null) {
      setDiscountBox(String(discountBoxValue));
    }
  }, [discountBoxValue]);

  // ➊ Add test with validation (optional id)
  const handleAddTestWithValidation = (tId) => {
    try {
      const id = tId ?? selectedTestId;

      if (!id) {
        toast.error('Please select a test to add');
        return;
      }

      const selectedTest = normalizedTestList.find((t) => t?._id === id);
      if (!selectedTest) {
        toast.error('Selected test not found');
        return;
      }

      const testExists = testRows.some((row) => row.testId === id);
      if (testExists) {
        toast.warning('This test is already added');
        return;
      }

      handleTestAdd(id);
      setSelectedTestId('');
    } catch (error) {
      console.error('Error adding test:', error);
      toast.error('Failed to add test. Please try again.');
    }
  };

  // ➋ Row change with rounding/clamps
  const handleRowChangeWithValidation = (i, field, value) => {
    try {
      const numericFields = ['amount', 'discount', 'paid'];
      if (numericFields.includes(field)) {
        // normalize user input
        let v = asMoney(value);

        // current row context for bounds
        const row = testRows[i] ?? {};
        const currAmount = asMoney(row.amount ?? 0);
        const currDiscount = asMoney(row.discount ?? 0);

        // Predict next values based on which field is changing
        const nextAmount = field === 'amount' ? v : currAmount;
        const nextDiscount = field === 'discount' ? v : currDiscount;

        // Enforce discount ≤ amount
        if (field === 'discount' && v > nextAmount) v = nextAmount;

        // Compute final for paid clamp
        const nextFinal = Math.max(0, round2(nextAmount - nextDiscount));
        if (field === 'paid' && v > nextFinal) v = nextFinal;

        handleTestRowChange(i, field, v);
        return;
      }

      if (['sampleDate', 'reportDate'].includes(field)) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (value && new Date(value) < todayStart) {
          toast.warning('Date cannot be in the past');
          return;
        }
      }

      handleTestRowChange(i, field, value);
    } catch (error) {
      console.error('Error updating test row:', error);
      toast.error('Failed to update test. Please try again.');
    }
  };

  const handleRemoveRowWithConfirmation = (i) => {
    try {
      if (window.confirm('Are you sure you want to remove this test?')) {
        handleRemoveRow(i);
        toast.success('Test removed successfully');
      }
    } catch (error) {
      console.error('Error removing test:', error);
      toast.error('Failed to remove test. Please try again.');
    }
  };

  const options = normalizedTestList
    .filter((test) => !testRows.some((row) => row.testId === test._id))
    .map((test) => ({
      value: test._id,
      label: `${test.testName || 'Unnamed Test'} - Rs ${fmt(
        test.testPrice || 0
      )}`,
    }));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <Select
          className="w-full"
          styles={{ container: (base) => ({ ...base, width: '100%' }) }}
          value={options.find((o) => o.value === selectedTestId) || null}
          onChange={(option) => {
            if (option) {
              setSelectedTestId(option.value);
              handleAddTestWithValidation(option.value); // auto-add
            }
          }}
          options={options}
          isLoading={isLoadingTests}
          placeholder={
            isLoadingTests
              ? 'Loading tests...'
              : noTestsAvailable
              ? 'Not available. First create the test.'
              : 'Search or select a test...'
          }
          isDisabled={isLoadingTests || noTestsAvailable}
        />

        <button
          type="button"
          className={`px-4 py-2 text-white rounded ${
            !selectedTestId || isLoadingTests
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-700 hover:bg-primary-800'
          }`}
          onClick={() => handleAddTestWithValidation()}
          disabled={!selectedTestId || isLoadingTests}
        >
          {isLoadingTests ? 'Loading...' : 'Add'}
        </button>
      </div>

      {testRows.length > 0 ? (
        <div className="w-full">
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  {[
                    '#',
                    'Test',
                    'Sample Date',
                    'Report Date',
                    'Amount',
                    'Discount',
                    'Final',
                    'Paid',
                    'Remaining',
                    'Action',
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 w-10">{r.quantity}</td>
                    <td className="border px-3 py-2 min-w-[150px]">
                      {r.testName}
                    </td>
                    <td className="border px-3 py-2 min-w-[120px]">
                      <input
                        type="date"
                        value={r.sampleDate}
                        onChange={(e) =>
                          handleRowChangeWithValidation(
                            i,
                            'sampleDate',
                            e.target.value
                          )
                        }
                        className="border p-1 rounded w-full"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </td>
                    <td className="border px-3 py-2 min-w-[120px]">
                      <input
                        type="date"
                        value={r.reportDate}
                        onChange={(e) =>
                          handleRowChangeWithValidation(
                            i,
                            'reportDate',
                            e.target.value
                          )
                        }
                        className="border p-1 rounded w-full"
                        min={
                          r.sampleDate || new Date().toISOString().split('T')[0]
                        }
                      />
                    </td>

                    {/* Amount */}
                    <td className="border px-3 py-2 min-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.amount}
                        onChange={(e) =>
                          handleRowChangeWithValidation(
                            i,
                            'amount',
                            e.target.value
                          )
                        }
                        onBlur={(e) => {
                          const v = asMoney(e.currentTarget.value);
                          handleRowChangeWithValidation(i, 'amount', v);
                        }}
                        inputMode="decimal"
                        onWheel={(e) => e.currentTarget.blur()}
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Discount */}
                    <td className="border px-3 py-2 min-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.discount}
                        onChange={(e) =>
                          handleRowChangeWithValidation(
                            i,
                            'discount',
                            e.target.value
                          )
                        }
                        onBlur={(e) => {
                          const v = asMoney(e.currentTarget.value);
                          handleRowChangeWithValidation(i, 'discount', v);
                        }}
                        inputMode="decimal"
                        onWheel={(e) => e.currentTarget.blur()}
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Final */}
                    <td className="border px-3 py-2 min-w-[80px] font-medium">
                      {fmt(r.finalAmount)}
                    </td>

                    {/* Paid */}
                    <td className="border px-3 py-2 min-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.paid}
                        onChange={(e) =>
                          handleRowChangeWithValidation(
                            i,
                            'paid',
                            e.target.value
                          )
                        }
                        onBlur={(e) => {
                          const v = asMoney(e.currentTarget.value);
                          handleRowChangeWithValidation(i, 'paid', v);
                        }}
                        inputMode="decimal"
                        onWheel={(e) => e.currentTarget.blur()}
                        className="border p-1 rounded w-full"
                      />
                    </td>

                    {/* Remaining */}
                    <td className="border px-3 py-2 min-w-[100px] font-medium">
                      {fmt(
                        Math.max(
                          0,
                          (toNum(r.finalAmount) || 0) - (toNum(r.paid) || 0)
                        )
                      )}
                    </td>

                    <td className="border px-3 py-2 min-w-[80px]">
                      <button
                        type="button"
                        onClick={() => handleRemoveRowWithConfirmation(i)}
                        className="text-red-600 hover:text-red-800 font-medium"
                        aria-label="Remove test"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 bg-gray-100 p-3 rounded">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <span className="font-medium">Total Tests:</span>{' '}
                {testRows.length}
              </div>

              <div>
                <span className="font-medium">Total Amount:</span> Rs.{' '}
                {fmt(totalAmount)}
              </div>

              {/* TOTAL DISCOUNT (shows discountAmount) */}
              <div className="col-span-2 flex items-center gap-2">
                <label className="font-medium whitespace-nowrap">
                  Total Discount:
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border p-1 rounded w-32"
                  value={discountBox}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setDiscountBox(val);
                    const v = asMoney(val);
                    applyOverallDiscount?.(v); // live apply
                  }}
                  onBlur={(e) => {
                    const v = asMoney(e.currentTarget.value);
                    setDiscountBox(String(v)); // normalize
                    applyOverallDiscount?.(v);
                  }}
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>

              {/* TOTAL PAID (shows advanceAmount) */}
              <div className="col-span-2 flex items-center gap-2">
                <label className="font-medium whitespace-nowrap">
                  Total Paid:
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border p-1 rounded w-32"
                  value={paidBox}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setPaidBox(val);
                    const v = asMoney(val);
                    applyOverallPaid?.(v); // live push to parent
                  }}
                  onBlur={(e) => {
                    const v = asMoney(e.currentTarget.value);
                    setPaidBox(String(v)); // normalize
                    applyOverallPaid?.(v);
                  }}
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={mode === 'edit'}
                />
              </div>

              {/* remaining */}
              <div>
                <span className="font-medium">Remaining:</span> Rs.{' '}
                {fmt(overallRemaining)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No tests added yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Select tests from the dropdown above
          </p>
        </div>
      )}
    </div>
  );
};

export default TestInformationForm;
