// src/pages/lab/PatientTestsTable.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPatientTestAll,
  deletepatientTest,
} from '../../../features/patientTest/patientTestSlice';
import { format, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import {
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiEdit,
  FiTrash2,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PrintA4 from './PrintPatientTest';
import ReactDOMServer from 'react-dom/server';
import { toast } from 'react-toastify';
// ------------- Normalizer -------------
// ------------- Normalizer -------------
const normalizeRecord = (rec) => {
  // patient snapshot can be in patient_Detail or a flat patient object
  const patient = rec?.patient_Detail || rec?.patient || {};

  // Support both old (selectedTests) and new (tests) shapes
  const rawTests =
    Array.isArray(rec?.tests) && rec.tests.length
      ? rec.tests
      : Array.isArray(rec?.selectedTests)
      ? rec.selectedTests
      : [];

  const normalizedTests = rawTests.map((st) => {
    // New shape: { testId, testName, price, discount, paid, remaining }
    if (st?.testName || st?.price !== undefined) {
      const price = Number(st?.price ?? 0);
      const discount = Math.max(0, Number(st?.discount ?? 0));
      const paid = Math.max(0, Number(st?.paid ?? 0));
      const finalAmount = Math.max(0, price - discount);
      const remaining = Math.max(0, finalAmount - paid);
      return {
        ...st,
        _norm: {
          testName: st?.testName || 'Unknown Test',
          testCode: st?.testCode || '',
          price,
          discount,
          paid,
          finalAmount,
          remaining,
        },
        testDate: st?.testDate || st?.sampleDate || null,
      };
    }

    // Old shape: selectedTests[i] may have testDetails populated or just test id
    const d = st?.testDetails || st?.test || {};
    const testName = d?.testName || st?.testName || 'Unknown Test';
    const testCode = d?.testCode || st?.testCode || '';
    const price = Number(st?.testPrice ?? d?.testPrice ?? 0);
    const discount = Math.max(0, Number(st?.discountAmount || 0));
    const paid = Math.max(0, Number(st?.advanceAmount || 0));
    const finalAmount = Math.max(0, price - discount);
    const remaining = Math.max(0, finalAmount - paid);

    return {
      ...st,
      _norm: {
        testName,
        testCode,
        price,
        discount,
        paid,
        finalAmount,
        remaining,
      },
      testDate: st?.testDate || st?.sampleDate || null,
    };
  });

  // Totals: prefer new financialSummary if present, else fall back
  const fin = rec?.financialSummary || {};
  const computedFinal = normalizedTests.reduce(
    (s, t) => s + t._norm.finalAmount,
    0
  );

  const totalAmount =
    Number(fin.totalAmount ?? rec?.totalAmount ?? 0) ||
    normalizedTests.reduce((s, t) => s + t._norm.price, 0);

  const totalPaid =
    Number(fin.totalPaid ?? rec?.totalPaid ?? rec?.advanceAmount ?? 0) ||
    normalizedTests.reduce((s, t) => s + t._norm.paid, 0);

  const totalDiscount =
    Number(fin.totalDiscount ?? rec?.discountAmount ?? 0) ||
    normalizedTests.reduce((s, t) => s + t._norm.discount, 0);

  const remainingAmount = Number(
    fin.totalRemaining ??
      rec?.remainingAmount ??
      Math.max(0, computedFinal - totalPaid)
  );

  const paymentStatus =
    fin.paymentStatus ||
    rec?.paymentStatus ||
    (remainingAmount === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending');

  return {
    ...rec,
    _norm: {
      patient: {
        MRNo: patient?.patient_MRNo || patient?.MRNo || patient?.mrNo || '',
        Name: patient?.patient_Name || patient?.Name || patient?.name || '',
        CNIC: patient?.patient_CNIC || patient?.CNIC || patient?.cnic || '',
        ContactNo:
          patient?.patient_ContactNo ||
          patient?.ContactNo ||
          patient?.contactNo ||
          '',
        Contact:
          patient?.patient_ContactNo ||
          patient?.ContactNo ||
          patient?.contactNo ||
          '',
        Gender:
          patient?.patient_Gender || patient?.Gender || patient?.gender || '',
        Age: patient?.patient_Age || patient?.Age || patient?.age || '',
        Guardian:
          patient?.patient_Guardian ||
          patient?.Guardian ||
          patient?.guardian ||
          '',

        // expose referredBy on patient snapshot too (useful in UI)
        ReferredBy:
          patient?.referredBy || patient?.ReferredBy || rec?.referredBy || '',
      },
      selectedTests: normalizedTests,
      totalAmount,
      totalDiscount,
      totalPaid,
      remainingAmount,
      paymentStatus,
      tokenNumber: rec?.tokenNumber ?? '',
      createdAt: rec?.createdAt ?? null,
      updatedAt:
        rec?.updatedAt ??
        rec?.financialSummary?.updatedAt ??
        rec?.modifiedAt ??
        null,
      // keep a top-level copy that survives across shapes
      referredBy:
        rec?.referredBy ?? patient?.referredBy ?? patient?.ReferredBy ?? '',
    },
  };
};

// ------------- Component -------------
const PatientTestsTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { allPatientTests, status, error } = useSelector(
    (state) => state.patientTest
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    gender: '',
    contact: '',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null); // stores normalized object

  const openModal = (normalizedTest) => {
    setSelectedTest(normalizedTest);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    setSelectedTest(null);
  };

  useEffect(() => {
    dispatch(fetchPatientTestAll());
  }, [dispatch]);

  // Build a normalized list once per store update
  const safeTests = useMemo(
    () => (allPatientTests || []).map(normalizeRecord),
    [allPatientTests]
  );

  // Local, sorted copy for optimistic UX
  const sortByRecent = useCallback((list) => {
    return [...list].sort((a, b) => {
      const ad = new Date(
        a._norm.updatedAt || a._norm.createdAt || 0
      ).getTime();
      const bd = new Date(
        b._norm.updatedAt || b._norm.createdAt || 0
      ).getTime();
      return bd - ad; // newest first
    });
  }, []);

  const [rows, setRows] = useState([]);

  // Seed rows whenever store data changes
  useEffect(() => {
    setRows(sortByRecent(safeTests));
  }, [safeTests, sortByRecent]);

  const handleEdit = (id) => {
    // Optional UI bump (visual only). Best is to have backend set updatedAt.
    setRows((cur) => {
      const idx = cur.findIndex((x) => x._id === id);
      if (idx === -1) return cur;
      const copy = [...cur];
      const [item] = copy.splice(idx, 1);
      item._norm.updatedAt = new Date().toISOString();
      copy.unshift(item);
      return copy;
    });
    navigate(`/lab/patient-tests/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        'Are you sure you want to delete this patient test record?'
      )
    ) {
      // optimistic remove
      const prevRows = rows;
      setRows((r) => r.filter((x) => x._id !== id));
      try {
        await dispatch(deletepatientTest(id)).unwrap();
        // background refresh to stay in sync
        dispatch(fetchPatientTestAll());
        toast.success('Record deleted sucessfully');
      } catch (e) {
        // revert on error
        setRows(prevRows);
        console.error('Delete failed:', e);
        toast.error(`Delete failed: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  const handlePrint = (t /* normalized object */) => {
    const printData = {
      tokenNumber: t.tokenNumber,
      patient: {
        MRNo: t.patient.MRNo,
        Name: t.patient.Name,
        CNIC: t.patient.CNIC,
        ContactNo: t.patient.ContactNo,
        Gender: t.patient.Gender,
        Age: t.patient.Age,
        // pull from _norm.referredBy first, then from patient.ReferredBy
        ReferredBy: t.referredBy || t.patient.ReferredBy || '',
        Guardian: t.patient.Guardian,
        MaritalStatus: t.patient.MaritalStatus,
      },
      tests: t.selectedTests.map((x) => ({
        testName: x._norm.testName,
        price: x._norm.price,
        discount: x._norm.discount,
        paid: x._norm.paid,
        finalAmount: x._norm.finalAmount,
      })),
      totalAmount: t.totalAmount,
      totalDiscount: t.totalDiscount,
      totalPaid: t.totalPaid,
      remaining: t.remainingAmount,
      sampleDate: t.selectedTests[0]?.testDate
        ? format(new Date(t.selectedTests[0].testDate), 'yyyy-MM-dd')
        : '',
      reportDate: t.selectedTests[0]?.testDate
        ? format(new Date(t.selectedTests[0].testDate), 'yyyy-MM-dd')
        : '',
    };

    console.log('printdata', printData);

    const w = window.open('', '_blank');
    if (!w) {
      const warn = document.createElement('div');
      warn.style = `
      position: fixed; top: 20px; right: 20px; padding: 15px; background: #ffeb3b;
      border: 1px solid #ffc107; border-radius: 4px; z-index: 9999;
    `;
      warn.innerHTML = `
      <p>Popup blocked! Please allow popups for this site.</p>
      <button onclick="this.parentNode.remove()">Dismiss</button>
    `;
      document.body.appendChild(warn);
      return;
    }

    const html = ReactDOMServer.renderToStaticMarkup(
      <PrintA4 formData={printData} />
    );

    w.document.open();
    w.document.write(`
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
      <body>${html}</body>
      <script>
        setTimeout(() => {
          window.print();
          window.onafterprint = function() { window.close(); };
        }, 500);
      </script>
    </html>
  `);
    w.document.close();
  };

  // Optional date-range filter helper
  const inDateRange = (createdAt, range) => {
    if (!range) return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    const now = new Date();
    if (range === 'today') return isSameDay(d, now);
    if (range === 'week') return isSameWeek(d, now, { weekStartsOn: 1 });
    if (range === 'month') return isSameMonth(d, now);
    return true;
  };

  const filteredTests = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const contactFilter = (filters.contact || '').toLowerCase();

    return rows.filter((test) => {
      const t = test._norm;
      const mr = t.patient.MRNo?.toString().toLowerCase() || '';
      const name = t.patient.Name?.toLowerCase() || '';
      const token = t.tokenNumber?.toString() || '';
      const contact = (
        t.patient.Contact ||
        t.patient.ContactNo ||
        ''
      ).toLowerCase();

      const matchesSearch =
        mr.includes(term) ||
        name.includes(term) ||
        token.includes(term) ||
        contact.includes(term);

      const matchesContact = contactFilter
        ? contact.includes(contactFilter)
        : true;

      const matchesStatus =
        !filters.status || t.paymentStatus === filters.status;
      const matchesGender =
        !filters.gender || t.patient.Gender === filters.gender;
      const matchesDate = inDateRange(t.createdAt, filters.dateRange);

      return (
        matchesSearch &&
        matchesContact &&
        matchesStatus &&
        matchesGender &&
        matchesDate
      );
    });
  }, [rows, searchTerm, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: '', dateRange: '', gender: '', contact: '' });
    setSearchTerm('');
  };

  if (status.fetchAll === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status.fetchAll === 'failed') {
    return (
      <div
        className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
        role="alert"
      >
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Patient Test Records
          </h1>
        </div>

        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="relative flex-grow mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by MR No, Name, Token # or Contact No"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <FiFilter className="mr-2" />
              Filters
              {showFilters ? (
                <FiChevronUp className="ml-2" />
              ) : (
                <FiChevronDown className="ml-2" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={filters.gender}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    name="dateRange"
                    value={filters.dateRange}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>

                {/* New Contact filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact No
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={filters.contact}
                    onChange={handleFilterChange}
                    placeholder="e.g. 0300-1234567"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTests.length} of {rows.length} records
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Token #</Th>
                <Th>MR No</Th>
                <Th>Patient Name</Th>
                <Th>Gender</Th>
                <Th>Contact No</Th>
                <Th>Age</Th>
                <Th>Tests</Th>
                <Th>Total Amount</Th>
                <Th>Remaining Amount</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="px-3">Actions</Th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.length > 0 ? (
                filteredTests.map((test) => {
                  const t = test._norm;
                  return (
                    <tr
                      key={test._id || `${t.tokenNumber}-${t.createdAt}`}
                      className="hover:bg-gray-50"
                    >
                      <Td center bold>
                        {t.tokenNumber}
                      </Td>
                      <Td>{t.patient.MRNo}</Td>
                      <Td bold>{t.patient.Name}</Td>
                      <Td center>{t.patient.Gender}</Td>
                      <Td center>{t.patient.Contact || t.patient.ContactNo}</Td>
                      <Td center>{t.patient.Age}</Td>

                      <td className="px-6 py-4 text-sm text-gray-500">
                        {t.selectedTests.slice(0, 2).map((x, i) => (
                          <div key={i} className="mb-1 last:mb-0">
                            <span className="font-medium">
                              {x._norm.testName}
                            </span>
                            {x._norm.testCode ? (
                              <span className="text-gray-400 ml-1">
                                ({x._norm.testCode})
                              </span>
                            ) : null}
                          </div>
                        ))}
                        {t.selectedTests.length > 2 && (
                          <button
                            onClick={() => openModal(t)}
                            className="text-blue-500 hover:underline text-sm mt-1"
                          >
                            See More
                          </button>
                        )}
                      </td>

                      <Td right>
                        <div className="font-medium">
                          Rs. {t.totalAmount.toLocaleString()}
                        </div>
                        {t.totalDiscount > 0 && (
                          <div className="text-xs text-gray-400">
                            Discount: Rs. {t.totalDiscount.toLocaleString()}
                          </div>
                        )}
                      </Td>

                      <Td right>
                        <div className="font-medium">
                          Rs. {t.remainingAmount.toLocaleString()}
                        </div>
                        {t.totalPaid > 0 && (
                          <div className="text-xs text-gray-400">
                            Paid: Rs. {t.totalPaid.toLocaleString()}
                          </div>
                        )}
                      </Td>

                      <Td>
                        {t.createdAt
                          ? format(new Date(t.createdAt), 'dd-MMM-yyyy')
                          : ''}
                      </Td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full 
                          ${
                            t.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : t.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : t.paymentStatus === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.paymentStatus}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-center gap-5 ml-7">
                          <button
                            onClick={() => handlePrint(t)}
                            className="text-green-600 hover:text-green-800"
                            title="Print"
                          >
                            <FiPrinter className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(test._id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(test._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="12"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No records found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isOpen && selectedTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                All Tests
              </h3>
              <div className="mt-2 space-y-2">
                {selectedTest.selectedTests.map((x, i) => (
                  <div key={i} className="mb-1 last:mb-0">
                    <span className="font-medium break-words">
                      {x._norm.testName}
                    </span>
                    {x._norm.testCode ? (
                      <span className="text-gray-400 ml-1">
                        ({x._norm.testCode})
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                onClick={closeModal}
                className="mt-4 bg-blue-100 text-blue-900 px-4 py-2 rounded-md hover:bg-blue-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Small presentational helpers
const Th = ({ children, className = '' }) => (
  <th
    scope="col"
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);

const Td = ({ children, right, center, bold }) => (
  <td
    className={`px-6 py-4 whitespace-nowrap text-sm ${
      right ? 'text-right' : center ? 'text-center' : 'text-left'
    } ${bold ? 'font-medium text-gray-900' : 'text-gray-500'}`}
  >
    {children}
  </td>
);

export default PatientTestsTable;
