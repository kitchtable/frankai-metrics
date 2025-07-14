import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Paper, Button, Alert, FormControl, FormControlLabel, Radio, RadioGroup, FormLabel, Select, MenuItem, Chip, OutlinedInput, InputLabel } from '@mui/material';
import { DataGrid, GridColDef, GridCellParams } from '@mui/x-data-grid';
import Papa, { ParseResult } from 'papaparse';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import Snackbar from '@mui/material/Snackbar';
import { DateRangePicker } from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { enGB } from 'date-fns/locale';
import { parse as parseDate, isAfter, isBefore, isEqual, startOfMonth, endOfMonth, subDays, startOfYear } from 'date-fns';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Checkbox } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const Plotly = require('plotly.js-dist-min');

// Required columns and their types
const REQUIRED_COLUMNS = [
  'Date', 'User Email', 'Company', 'Role', 'Last Login', 'Total Activities',
  'Frank AI Searches', 'Project Creations', 'Messages Sent', 'Material Saves',
  'Doc Uploads', 'Project Shares', 'Frank AI Messages', 'Sample Requests', 'Prebookings'
];
const NUMERIC_COLUMNS = [
  'Total Activities', 'Frank AI Searches', 'Project Creations', 'Messages Sent',
  'Material Saves', 'Doc Uploads', 'Project Shares', 'Frank AI Messages', 'Sample Requests', 'Prebookings'
];

function cleanString(str: any): string {
  if (typeof str !== 'string') return str;
  // Remove BOM, invisible, and whitespace chars
  return str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function isValidDate(dateStr: string) {
  // Accept DD/MM/YYYY or YYYY-MM-DD
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr) || /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function toDDMMYYYY(dateStr: string): string {
  // If already DD/MM/YYYY, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // If YYYY-MM-DD, convert
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}

function isValidRole(role: string) {
  return role === 'Brand' || role === 'Supplier';
}

function parseAndValidateCSV(file: File, onResult: (rows: any[], errors: string[]) => void) {
  Papa.parse<any>(file as any, {
    header: true,
    skipEmptyLines: true,
    complete: (results: ParseResult<any>) => {
      const data = results.data as any[];
      const errors: string[] = [];
      // Check for required columns
      const columns = results.meta.fields || [];
      for (const col of REQUIRED_COLUMNS) {
        if (!columns.includes(col)) {
          errors.push(`Missing required column: ${col}`);
        }
      }
      // Validate rows
      const validatedRows = data.map((row, idx) => {
        const rowErrors: string[] = [];
        const rowWarnings: string[] = [];
        // Trim all string fields
        for (const key in row) {
          if (typeof row[key] === 'string') {
            const original = row[key];
            const cleaned = cleanString(original);
            if (original !== cleaned) {
              rowWarnings.push(`${key} auto-corrected by trimming`);
              row[key] = cleaned;
            }
          }
        }
        // Date format (robust, accepts both formats)
        const rawDate = row['Date'];
        const cleanedDate = cleanString(rawDate);
        if (!isValidDate(cleanedDate)) {
          // eslint-disable-next-line no-console
          console.warn(`Row ${idx + 2}, Column 'Date': Invalid date format. Raw: '${rawDate}', Cleaned: '${cleanedDate}'`);
          rowErrors.push(`Row ${idx + 2}, Column 'Date': Invalid date format (value: '${rawDate}')`);
        } else {
          // Convert to DD/MM/YYYY for internal use
          const ddmmyyyy = toDDMMYYYY(cleanedDate);
          if (cleanedDate !== ddmmyyyy) {
            rowWarnings.push("Date auto-converted to DD/MM/YYYY");
          }
          row['Date'] = ddmmyyyy;
        }
        // Role
        if (!isValidRole(row['Role'])) {
          rowErrors.push(`Row ${idx + 2}, Column 'Role': Invalid role (value: '${row['Role']}')`);
        }
        // Numeric columns
        for (const col of NUMERIC_COLUMNS) {
          let val = row[col];
          if (val === '' || val === undefined || val === null) {
            row[col] = 0;
          } else if (isNaN(Number(val))) {
            rowErrors.push(`Row ${idx + 2}, Column '${col}': Non-numeric value (value: '${val}')`);
          } else if (Number(val) < 0) {
            rowErrors.push(`Row ${idx + 2}, Column '${col}': Negative value (value: '${val}')`);
          } else {
            row[col] = Number(val);
          }
        }
        row._rowErrors = rowErrors;
        row._rowWarnings = rowWarnings;
        return row;
      });
      // Collect row errors and warnings
      validatedRows.forEach((row, idx) => {
        if (row._rowErrors.length > 0) {
          row._rowErrors.forEach((err: string) => errors.push(err));
        }
        if (row._rowWarnings && row._rowWarnings.length > 0) {
          errors.push(`Row ${idx + 2} (warning): ${row._rowWarnings.join(', ')}`);
        }
      });
      onResult(validatedRows, errors);
    },
    error: (error: Error, file: File) => {
      onResult([], [error.message]);
    }
  });
}

const columns: GridColDef[] = [
  { field: 'Date', headerName: 'Date', width: 110 },
  { field: 'User Email', headerName: 'User Email', width: 200 },
  { field: 'Company', headerName: 'Company', width: 150 },
  { field: 'Role', headerName: 'Role', width: 100 },
  { field: 'Last Login', headerName: 'Last Login', width: 150 },
  { field: 'Total Activities', headerName: 'Total Activities', width: 120, type: 'number' },
  { field: 'Frank AI Searches', headerName: 'Frank AI Searches', width: 120, type: 'number' },
  { field: 'Project Creations', headerName: 'Project Creations', width: 120, type: 'number' },
  { field: 'Messages Sent', headerName: 'Messages Sent', width: 120, type: 'number' },
  { field: 'Material Saves', headerName: 'Material Saves', width: 120, type: 'number' },
  { field: 'Doc Uploads', headerName: 'Doc Uploads', width: 120, type: 'number' },
  { field: 'Project Shares', headerName: 'Project Shares', width: 120, type: 'number' },
  { field: 'Frank AI Messages', headerName: 'Frank AI Messages', width: 120, type: 'number' },
  { field: 'Sample Requests', headerName: 'Sample Requests', width: 120, type: 'number' },
  { field: 'Prebookings', headerName: 'Prebookings', width: 120, type: 'number' },
];

function aggregateChartData(rows: any[]) {
  // Group by date, then by company
  const dateMap: Record<string, Record<string, number>> = {};
  const allCompanies = new Set<string>();
  rows.forEach(row => {
    if (row._rowErrors && row._rowErrors.length > 0) return; // skip error rows
    const date = row['Date'];
    const company = row['Company'];
    const activities = row['Total Activities'] || 0;
    allCompanies.add(company);
    if (!dateMap[date]) dateMap[date] = {};
    if (!dateMap[date][company]) dateMap[date][company] = 0;
    dateMap[date][company] += activities;
  });
  const companies = Array.from(allCompanies);
  // Convert to array for Recharts, filling missing companies with 0
  const chartData = Object.keys(dateMap).sort((a, b) => {
    // Sort by date (DD/MM/YYYY)
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  }).map(date => {
    const entry: Record<string, any> = { Date: date };
    companies.forEach(company => {
      entry[company] = dateMap[date][company] ?? 0;
    });
    return entry;
  });
  return { chartData, companies };
}

function parseDDMMYYYY(dateStr: string) {
  // Parse DD/MM/YYYY to Date
  return parseDate(dateStr, 'dd/MM/yyyy', new Date());
}

function parseYYYYMMDD(dateStr: string) {
  // Parse YYYY-MM-DD to Date
  return parseDate(dateStr, 'yyyy-MM-dd', new Date());
}

function getAllDates(rows: any[]) {
  // Return all valid dates as Date objects
  return rows
    .map(r => {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(r['Date'])) return parseDDMMYYYY(r['Date']);
      if (/^\d{4}-\d{2}-\d{2}$/.test(r['Date'])) return parseYYYYMMDD(r['Date']);
      return null;
    })
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
}

function calcAvgAndTrend(activity: any, periodDays: any, endDate: any, allRows: any, company: any) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const end = new Date(endDate);
  const start = new Date(end.getTime() - (periodDays - 1) * msPerDay);
  const prevEnd = new Date(start.getTime() - msPerDay);
  const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * msPerDay);
  const currRows = allRows.filter((r: any) => r['Company'] === company && new Date(r['Date']) >= start && new Date(r['Date']) <= end);
  const prevRows = allRows.filter((r: any) => r['Company'] === company && new Date(r['Date']) >= prevStart && new Date(r['Date']) <= prevEnd);
  const currDays = new Set(currRows.map((r: any) => r['Date'])).size || 1;
  const prevDays = new Set(prevRows.map((r: any) => r['Date'])).size || 1;
  const currSum = currRows.reduce((acc: any, r: any) => acc + (Number(r[activity]) || 0), 0);
  const prevSum = prevRows.reduce((acc: any, r: any) => acc + (Number(r[activity]) || 0), 0);
  const currAvg = currSum / currDays;
  const prevAvg = prevSum / prevDays;
  let trend = '→';
  if (prevAvg === 0 && currAvg > 0) trend = '↑';
  else if (prevAvg > 0) {
    const pct = (currAvg - prevAvg) / prevAvg;
    if (pct > 0.1) trend = '↑';
    else if (pct < -0.1) trend = '↓';
  }
  return { currAvg, trend };
}

function parseDateString(dateStr: string): Date {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    // DD/MM/YYYY
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr); // fallback
}

function App() {
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [exportMethod, setExportMethod] = useState<'recharts' | 'plotly'>('recharts');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  
  // Entity selection state
  const [entityFilterType, setEntityFilterType] = useState<'all' | 'brands' | 'suppliers' | 'specific'>('all');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState('Total Activities');
  const [showRunningTotal, setShowRunningTotal] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Compute min/max date from data
  const allDates = getAllDates(rows);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

  // Set default date range when data loads
  React.useEffect(() => {
    if (minDate && maxDate) {
      // Only set if the current dateRange is not already [minDate, maxDate]
      if (
        !dateRange[0] ||
        !dateRange[1] ||
        dateRange[0].getTime() !== minDate.getTime() ||
        dateRange[1].getTime() !== maxDate.getTime()
      ) {
        setDateRange([minDate, maxDate]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  // Filter rows by date range
  function isInRange(dateStr: string) {
    if (!dateRange[0] || !dateRange[1]) return true;
    let d: Date;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) d = parseDDMMYYYY(dateStr);
    else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) d = parseYYYYMMDD(dateStr);
    else return false;
    return (
      (isAfter(d, dateRange[0]) || isEqual(d, dateRange[0])) &&
      (isBefore(d, dateRange[1]) || isEqual(d, dateRange[1]))
    );
  }

  // Filter rows by date range and entity selection
  const filteredRows = rows.filter(r => {
    // First filter by date range
    if (!isInRange(r['Date'])) return false;
    
    // Then filter by entity selection
    switch (entityFilterType) {
      case 'brands':
        return r['Role'] === 'Brand';
      case 'suppliers':
        return r['Role'] === 'Supplier';
      case 'specific':
        return selectedCompanies.includes(r['Company']);
      case 'all':
      default:
        return true; // Show all brands and suppliers
    }
  });

  // Compute summary counts (exclude header row)
  const successfulRows = filteredRows.filter(r => r._rowErrors && r._rowErrors.length === 0);
  const unsuccessfulRows = filteredRows.filter(r => r._rowErrors && r._rowErrors.length > 0);
  const totalErrors = filteredRows.reduce((acc, r) => acc + (r._rowErrors ? r._rowErrors.length : 0), 0);
  const totalWarnings = filteredRows.reduce((acc, r) => acc + (r._rowWarnings ? r._rowWarnings.length : 0), 0);

  const [dataTableOpen, setDataTableOpen] = useState(false); // collapsed by default

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      parseAndValidateCSV(file, (parsedRows, parseErrors) => {
        // Add id for DataGrid
        const rowsWithId = parsedRows.map((row, idx) => ({ id: idx, ...row }));
        setRows(rowsWithId);
        setErrors(parseErrors);
        setShowDetails(false); // Reset details toggle on new upload
        setDataTableOpen(false); // Collapse data table on new upload
      });
    }
  };

  // Helper to get earliest and latest date from chart data
  function getDateRange(chartData: any[]) {
    if (!chartData.length) return { start: 'NA', end: 'NA' };
    return { start: chartData[0].Date.replace(/\//g, ''), end: chartData[chartData.length - 1].Date.replace(/\//g, '') };
  }

  // Get current filter description
  const getFilterDescription = () => {
    switch (entityFilterType) {
      case 'brands':
        return 'All Brands';
      case 'suppliers':
        return 'All Suppliers';
      case 'specific':
        if (selectedCompanies.length === 0) {
          return 'All Brands and Suppliers';
        } else if (selectedCompanies.length === 1) {
          return selectedCompanies[0];
        } else {
          return `${selectedCompanies.length} specific companies`;
        }
      case 'all':
      default:
        return 'All Brands and Suppliers';
    }
  };

  // Get filter code based on entity selection
  const getFilterCode = () => {
    switch (entityFilterType) {
      case 'brands':
        return 'AB'; // All Brands
      case 'suppliers':
        return 'AS'; // All Suppliers
      case 'specific':
        if (selectedCompanies.length === 1) {
          return selectedCompanies[0]; // Single company name
        } else if (selectedCompanies.length > 1) {
          return `CUSTOM${selectedCompanies.length}`; // Multiple selections
        } else {
          return 'ALL'; // No specific companies selected, default to all
        }
      case 'all':
      default:
        return 'ALL'; // All Brands and Suppliers
    }
  };

  // Helper: Get all numeric columns for dropdown
  const numericColumns = [
    'Total Activities',
    'Frank AI Searches',
    'Project Creations',
    'Messages Sent',
    'Material Saves',
    'Doc Uploads',
    'Project Shares',
    'Frank AI Messages',
    'Sample Requests',
    'Prebookings',
  ];

  // --- Chart Data Preparation ---
  function aggregateChartDataSeries(rows: any[], series: string) {
    // Group by date, then by company, for the selected series
    const dateMap: Record<string, Record<string, number>> = {};
    const allCompanies = new Set<string>();
    rows.forEach(row => {
      if (row._rowErrors && row._rowErrors.length > 0) return; // skip error rows
      const date = row['Date'];
      const company = row['Company'];
      const value = row[series] || 0;
      allCompanies.add(company);
      if (!dateMap[date]) dateMap[date] = {};
      if (!dateMap[date][company]) dateMap[date][company] = 0;
      dateMap[date][company] += value;
    });
    const companies = Array.from(allCompanies);
    // Convert to array for Recharts, filling missing companies with 0
    const chartData = Object.keys(dateMap).sort((a, b) => {
      // Sort by date (DD/MM/YYYY)
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    }).map(date => {
      const entry: Record<string, any> = { Date: date };
      companies.forEach(company => {
        entry[company] = dateMap[date][company] ?? 0;
      });
      return entry;
    });
    return { chartData, companies };
  }

  // Helper to shorten company names for legend
  function getShortName(name: string, mode: number) {
    if (mode === 1) return name;
    if (mode === 2) return name.length > 23 ? name.slice(0, 23) + '…' : name;
    if (mode === 3) {
      const firstWord = name.split(' ')[0];
      return firstWord.length > 6 ? firstWord.slice(0, 6) + '…' : firstWord;
    }
    return name;
  }

  // Export chart section to PNG (Recharts + html2canvas)
  const handleExport = () => {
    const chartSection = document.getElementById('chart-section-export');
    if (!chartSection) return;
    html2canvas(chartSection, { backgroundColor: '#fff', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      // Get date range for filename
      const { chartData } = aggregateChartDataSeries(filteredRows, selectedSeries);
      const { start, end } = getDateRange(chartData);
      const now = new Date();
      const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filterCode = getFilterCode();
      const runningTotalPart = showRunningTotal ? '_RT' : '';
      const allSeriesPart = showAllSeries ? '_ALLSERIES' : '';
      link.download = `AT_${filterCode}_${start}_${end}_${showAllSeries ? 'AllDataSeries' : selectedSeries.replace(/\s+/g, '')}${runningTotalPart}${allSeriesPart}_${hhmmss}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setExportMethod('recharts');
      setSnackbarOpen(true);
    });
  };

  // Export chart section to PNG (Plotly - for comparison)
  const handleExportPlotly = async () => {
    try {
      // Get chart data
      const { chartData, companies } = aggregateChartDataSeries(filteredRows, selectedSeries);
      
      // Convert data to Plotly format
      const traces = [];
      const colors = [
        '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f',
        '#0097a7', '#f57c00', '#512da8', '#00796b', '#c62828', '#0288d1', '#fbc02d', '#388e3c', '#1976d2', '#d32f2f'
      ];

      // Determine legend columns and name shortening mode
      let legendCols = 1;
      let nameMode = 1;
      if (companies.length > 12) {
        legendCols = 3;
        nameMode = 3;
      } else if (companies.length > 6) {
        legendCols = 2;
        nameMode = 2;
      }

      // Sort companies alphabetically for legend and traces
      const sortedCompanies = [...companies].sort((a, b) => a.localeCompare(b));
      // Sort activity types alphabetically for all-series mode
      const sortedNumericColumns = [...numericColumns].sort((a, b) => a.localeCompare(b));

      // Add traces for each company/series
      if (showAllSeries && companies.length === 1) {
        // All activity types for single company, sorted
        sortedNumericColumns.forEach((col, idx) => {
          traces.push({
            x: chartData.map(row => row.Date),
            y: chartData.map(row => filteredRows.find(r => r['Date'] === row.Date && r['Company'] === companies[0])?.[col] || 0),
            type: 'scatter',
            mode: 'lines',
            name: getShortName(col, nameMode),
            customdata: col, // full name for tooltip
            hovertemplate: '%{customdata}<br>Date: %{x}<br>Value: %{y}<extra></extra>',
            line: { color: colors[idx % colors.length], width: 2 }
          });
        });
      } else {
        // Companies as separate traces, sorted
        sortedCompanies.forEach((company, idx) => {
          traces.push({
            x: chartData.map(row => row.Date),
            y: chartData.map(row => row[company] || 0),
            type: 'scatter',
            mode: 'lines',
            name: getShortName(company, nameMode),
            customdata: company, // full name for tooltip
            hovertemplate: '%{customdata}<br>Date: %{x}<br>Value: %{y}<extra></extra>',
            line: { color: colors[idx % colors.length], width: 2 }
          });
        });
      }

      // Add running total if enabled
      if (showRunningTotal) {
        const runningTotalData = getAggregateRunningTotalData(chartData, companies);
        traces.push({
          x: runningTotalData.map(row => row.Date),
          y: runningTotalData.map(row => row.RunningTotal),
          type: 'scatter',
          mode: 'lines',
          name: 'Running Total',
          line: { 
            color: '#d32f2f', 
            width: 3,
            dash: 'dash'
          }
        });
      }

      // Get dynamic title prefix based on entity filter
      let titlePrefix = 'Company';
      if (entityFilterType === 'brands') titlePrefix = 'Brand';
      else if (entityFilterType === 'suppliers') titlePrefix = 'Supplier';
      else if (entityFilterType === 'all' || entityFilterType === 'specific') titlePrefix = 'Brand & Supplier';

      // Get date range for title
      let chartTitle = `${titlePrefix} Activity Timeline`;
      if (chartData.length > 0) {
        const startDate = chartData[0].Date;
        const endDate = chartData[chartData.length - 1].Date;
        chartTitle = `${titlePrefix} Activity Timeline (${startDate} – ${endDate})`;
      }
      // Create Plotly layout
      const layout = {
        title: { text: chartTitle, font: { size: 14 } },
        xaxis: {
          // No title for x-axis
          tickangle: -45,
          automargin: true,
          tickfont: { size: 6 }
        },
        yaxis: {
          title: { text: 'Activity Count', font: { size: 14 } },
          automargin: true
        },
        width: 1000,
        height: 500,
        margin: { l: 70, r: 30, t: 70, b: 140 },
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: -0.3, font: { size: 12 }, ncol: legendCols },
        font: { size: 12 },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
      };

      // Create temporary div for Plotly
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.height = '400px';
      document.body.appendChild(tempDiv);

      // Render Plotly chart
      await Plotly.newPlot(tempDiv, traces, layout);

      // Export to PNG
      const pngData = await Plotly.toImage(tempDiv, {
        format: 'png',
        width: 800,
        height: 400,
        scale: 2
      });

      // Create download link
      const link = document.createElement('a');
      const { start, end } = getDateRange(chartData);
      const now = new Date();
      const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filterCode = getFilterCode();
      const runningTotalPart = showRunningTotal ? '_RT' : '';
      const allSeriesPart = showAllSeries ? '_ALLSERIES' : '';
      link.download = `AT_PLOTLY_${filterCode}_${start}_${end}_${showAllSeries ? 'AllDataSeries' : selectedSeries.replace(/\s+/g, '')}${runningTotalPart}${allSeriesPart}_${hhmmss}.png`;
      link.href = pngData;
      link.click();

      // Clean up
      document.body.removeChild(tempDiv);
      setExportMethod('plotly');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Plotly export error:', error);
      alert('Failed to export with Plotly: ' + error);
    }
  };

  // Helper: Clamp a date to min/max
  function clampDate(date: Date, min: Date, max: Date) {
    if (date < min) return min;
    if (date > max) return max;
    return date;
  }

  // Preset definitions
  const today = new Date();
  const presets = [
    {
      label: 'Last 7 days',
      getRange: (min: Date, max: Date) => {
        const end = max;
        const start = clampDate(subDays(end, 6), min, max);
        return [start, end];
      },
    },
    {
      label: 'Last 14 days',
      getRange: (min: Date, max: Date) => {
        const end = max;
        const start = clampDate(subDays(end, 13), min, max);
        return [start, end];
      },
    },
    {
      label: 'Last 30 days',
      getRange: (min: Date, max: Date) => {
        const end = max;
        const start = clampDate(subDays(end, 29), min, max);
        return [start, end];
      },
    },
    {
      label: 'This Month',
      getRange: (min: Date, max: Date) => {
        const start = clampDate(startOfMonth(max), min, max);
        const end = max;
        return [start, end];
      },
    },
    {
      label: 'Last Month',
      getRange: (min: Date, max: Date) => {
        const lastMonthEnd = startOfMonth(max);
        const lastMonthStart = startOfMonth(subDays(lastMonthEnd, 1));
        const start = clampDate(lastMonthStart, min, max);
        const end = clampDate(subDays(lastMonthEnd, 1), min, max);
        return [start, end];
      },
    },
    {
      label: 'Year to Date',
      getRange: (min: Date, max: Date) => {
        const start = clampDate(startOfYear(max), min, max);
        const end = max;
        return [start, end];
      },
    },
    {
      label: 'All Time',
      getRange: (min: Date, max: Date) => [min, max],
    },
  ];

  // Running total calculation (aggregate for all selected companies)
  function getAggregateRunningTotalData(chartData: any[], companies: string[]) {
    let aggTotal = 0;
    return chartData.map((row) => {
      let daySum = 0;
      companies.forEach(company => {
        daySum += row[company] || 0;
      });
      aggTotal += daySum;
      return { Date: row.Date, RunningTotal: aggTotal };
    });
  }

  // --- Activity Trends Table ---
  // Generate Reports PDF (sequential, robust)
  const handleGenerateReports = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      let y = 40;
      // Branding and filter summary (cover page)
      doc.setFontSize(20);
      doc.text('FrankAI Analytics Report', 40, y);
      y += 30;
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
      y += 20;
      doc.text(`Date Range: ${dateRange[0]?.toLocaleDateString() || ''} - ${dateRange[1]?.toLocaleDateString() || ''}`, 40, y);
      y += 20;
      doc.text(`Entity Filter: ${getFilterDescription()}`, 40, y);
      // Insert a new page for the Activity Timeline Chart for all brands in scope
      // Prepare chart data for all brands in scope (filteredRows, 'Total Activities')
      const { chartData: chartDataAllBrands, companies: companiesAllBrands } = aggregateChartDataSeries(filteredRows, 'Total Activities');
      doc.addPage();
      let chartPageY = 40;
      doc.setFontSize(16);
      doc.text('Activity Timeline Chart (All Brands in Scope)', 40, chartPageY);
      chartPageY += 20;
      // Render the chart as in the UI
      const chartContainer = document.createElement('div');
      chartContainer.style.position = 'fixed';
      chartContainer.style.left = '-9999px';
      chartContainer.style.width = '600px';
      chartContainer.style.height = '250px';
      document.body.appendChild(chartContainer);
      const ReactDOM = await import('react-dom/client');
      const { createRoot } = ReactDOM;
      const root = createRoot(chartContainer);
      const colors = [
        '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f',
        '#0097a7', '#f57c00', '#512da8', '#00796b', '#c62828', '#0288d1', '#fbc02d', '#388e3c', '#1976d2', '#d32f2f'
      ];
      root.render(
        <ResponsiveContainer width={600} height={250}>
          <LineChart data={chartDataAllBrands} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {companiesAllBrands.map((company, idx) => (
              <Line
                key={company}
                type="monotone"
                dataKey={company}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name={company}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      const chartCanvas = await html2canvas(chartContainer, { backgroundColor: '#fff', scale: 2 });
      const chartImg = chartCanvas.toDataURL('image/png');
      document.body.removeChild(chartContainer);
      doc.addImage(chartImg, 'PNG', 40, chartPageY, 500, 200);
      // For each brand/supplier in scope, alphabetical order, start each on a new page after cover
      const { chartData, companies } = aggregateChartDataSeries(filteredRows, 'Total Activities');
      const sortedCompanies = [...companies].sort((a, b) => a.localeCompare(b));
      const originalRows = rows.map(row => ({ ...row }));
      for (const company of sortedCompanies) {
        doc.addPage();
        let pageY = 40;
        // Filter data for this company
        const companyData = chartData.map(row => ({ Date: row.Date, [company]: row[company] }));
        // Prepare running total
        let runningTotal = 0;
        const companyDataWithRT = companyData.map(row => {
          runningTotal += row[company] || 0;
          return { ...row, RunningTotal: runningTotal };
        });
        // Render first chart (Total Activities + Running Total)
        const chartContainer1 = document.createElement('div');
        chartContainer1.style.position = 'fixed';
        chartContainer1.style.left = '-9999px';
        chartContainer1.style.width = '600px';
        chartContainer1.style.height = '200px';
        document.body.appendChild(chartContainer1);
        const ReactDOM = await import('react-dom/client');
        const { createRoot } = ReactDOM;
        const root1 = createRoot(chartContainer1);
        root1.render(
          <ResponsiveContainer width={600} height={200}>
            <LineChart data={companyDataWithRT} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                key={company}
                type="monotone"
                dataKey={company}
                stroke="#1976d2"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Total Activities"
              />
              <Line
                key="RunningTotal"
                type="monotone"
                dataKey="RunningTotal"
                stroke="#d32f2f"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                strokeDasharray="8 4"
                name="Running Total"
              />
            </LineChart>
          </ResponsiveContainer>
        );
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas1 = await html2canvas(chartContainer1, { backgroundColor: '#fff', scale: 2 });
        const imgData1 = canvas1.toDataURL('image/png');
        document.body.removeChild(chartContainer1);
        // Prepare data for second chart (all activity types except Total Activities)
        const activityTypes = numericColumns.filter(col => col !== 'Total Activities');
        const companyActivityData = chartData.map(row => {
          const entry: Record<string, any> = { Date: row.Date };
          activityTypes.forEach(col => {
            entry[col] = filteredRows.find(r => r['Date'] === row.Date && r['Company'] === company)?.[col] || 0;
          });
          return entry;
        });
        // Render second chart (all activity types)
        const chartContainer2 = document.createElement('div');
        chartContainer2.style.position = 'fixed';
        chartContainer2.style.left = '-9999px';
        chartContainer2.style.width = '600px';
        chartContainer2.style.height = '200px';
        document.body.appendChild(chartContainer2);
        const root2 = createRoot(chartContainer2);
        root2.render(
          <ResponsiveContainer width={600} height={200}>
            <LineChart data={companyActivityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {activityTypes.map((col, idx) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={['#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f'][idx % 10]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name={col}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas2 = await html2canvas(chartContainer2, { backgroundColor: '#fff', scale: 2 });
        const imgData2 = canvas2.toDataURL('image/png');
        document.body.removeChild(chartContainer2);
        // Add brand label and both charts to the page
        doc.setFontSize(14);
        doc.text(`Brand: ${company}`, 40, pageY);
        pageY += 20;
        doc.addImage(imgData1, 'PNG', 40, pageY, 500, 170);
        pageY += 180;
        // Add extra space between charts
        pageY += 30;
        doc.setFontSize(12);
        doc.text('Activity Type Breakdown', 40, pageY);
        pageY += 15;
        doc.addImage(imgData2, 'PNG', 40, pageY, 500, 170);
      }
      doc.save('FrankAI-Analytics-Report.pdf');
      setGeneratingPDF(false);
      setSnackbarOpen(true);
    } catch (err) {
      setGeneratingPDF(false);
      alert('Failed to generate PDF: ' + err);
    }
  };

  // Add after the existing PDF export function
  const handleGenerateTrendTablesPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const originalRows = rows.map(row => ({ ...row }));
    
    // Calculate brandsInScope and suppliersInScope before using them
    const { companies } = aggregateChartDataSeries(rows, 'Total Activities');
    let brandsInScope: string[] = [];
    let suppliersInScope: string[] = [];
    if (entityFilterType === 'all' || entityFilterType === 'specific') {
      brandsInScope = companies.filter(company => rows.some(row => row['Company'] === company && row['Role'] === 'Brand'));
      suppliersInScope = companies.filter(company => rows.some(row => row['Company'] === company && row['Role'] === 'Supplier'));
    } else if (entityFilterType === 'brands') {
      brandsInScope = companies.filter(company => rows.some(row => row['Company'] === company && row['Role'] === 'Brand'));
    } else if (entityFilterType === 'suppliers') {
      suppliersInScope = companies.filter(company => rows.some(row => row['Company'] === company && row['Role'] === 'Supplier'));
    }
    // ... continue with tables as before, using doc ...
    const end = new Date();
    const start = new Date(end.getTime() - (180 - 1) * 24 * 60 * 60 * 1000);
    const dateRangeText = `Activity from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    
    // Table periods
    const periods = [7, 14, 30, 90, 180];
    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Helper function to create summary table
    const createSummaryTable = (companies: string[], title: string, pageY: number) => {
      // Build summary table head
      const summaryHead = [
        [
          'Company',
          ...periods.flatMap(p => [`${p}d Avg`, `${p}d Actual`])
        ]
      ];
      
      // Build summary table body with one row per company
      const summaryBody = companies.map(company => {
        const row = [company];
        periods.forEach(period => {
          const periodStart = new Date(end.getTime() - (period - 1) * msPerDay);
          const periodRows = originalRows.filter((r: any) => {
            const d = parseDateString(r['Date']);
            return d >= periodStart && d <= end && r['Company'] === company;
          });
          const actual = periodRows.reduce((acc: number, r: any) => acc + (Number(r['Total Activities']) || 0), 0);
          const avg = actual / period;
          row.push(avg.toFixed(1), actual.toString());
        });
        return row;
      });
      
      // Add total row at the bottom
      const totalRow = ['Total Activities'];
      periods.forEach(period => {
        const periodStart = new Date(end.getTime() - (period - 1) * msPerDay);
        const periodRows = originalRows.filter((r: any) => {
          const d = parseDateString(r['Date']);
          return d >= periodStart && d <= end && companies.includes(r['Company']);
        });
        const actual = periodRows.reduce((acc: number, r: any) => acc + (Number(r['Total Activities']) || 0), 0);
        const avg = actual / period;
        totalRow.push(avg.toFixed(1), actual.toString());
      });
      summaryBody.push(totalRow);
      
      // Render summary table
      autoTable(doc, {
        head: summaryHead,
        body: summaryBody,
        startY: pageY,
        theme: 'grid',
        headStyles: { fillColor: [224, 224, 224], textColor: 20, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', fontSize: 12 },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        styles: { cellPadding: 6, font: 'helvetica' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: 40, right: 40 },
        didParseCell: function (data) {
          // Highlight the 'Total Activities' row like the header
          if (data.row.index === summaryBody.length - 1) {
            data.cell.styles.fillColor = [224, 224, 224];
            data.cell.styles.fontStyle = 'bold';
          }
          // Indicator colors for Avg columns only
          if (data.row.section === 'body' && data.column.index > 0) {
            const colIdx = data.column.index - 1; // skip Company
            const periodIdx = Math.floor(colIdx / 2);
            const isAvg = colIdx % 2 === 0;
            // Only apply color to Avg columns
            if (isAvg && periodIdx < periods.length - 1) {
              const thisVal = parseFloat(String(data.cell.raw));
              const nextVal = parseFloat(String(summaryBody[data.row.index][1 + (periodIdx + 1) * 2]));
              if (!isNaN(thisVal) && !isNaN(nextVal)) {
                if (thisVal > nextVal) {
                  data.cell.styles.textColor = [0, 128, 0]; // green
                } else if (thisVal < nextVal) {
                  data.cell.styles.textColor = [220, 38, 38]; // red
                } else {
                  data.cell.styles.textColor = [234, 179, 8]; // yellow
                }
              }
            }
          }
          // Bold right border after first column and every 2 columns (after each period)
          if (
            data.column.index === 0 ||
            (data.column.index > 0 && (data.column.index - 1) % 2 === 1)
          ) {
            data.cell.styles.lineWidth = { right: 1.5 };
            data.cell.styles.lineColor = [0, 0, 0];
          }
        },
      });
      
      // Add legend below summary table
      const summaryLegendY = (doc as any).lastAutoTable.finalY + 18;
      doc.setFontSize(12);
      doc.text('Legend: Avg = average per calendar day in period, Actual = total events in period', 40, summaryLegendY);
      doc.text('Colour meaning: Green = higher than next period, Red = lower, Yellow = same as next period.', 40, summaryLegendY + 16);
    };
    
    // Page 1: Brand summary table (if brands exist)
    if (brandsInScope.length > 0) {
      let pageY = 60;
      doc.setFontSize(22);
      doc.text('Activity Summary Across All Brands', 40, pageY);
      pageY += 30;
      doc.setFontSize(14);
      doc.text(dateRangeText, 40, pageY);
      pageY += 20;
      
      // Sort brands alphabetically
      const sortedBrands = [...brandsInScope].sort((a, b) => a.localeCompare(b));
      createSummaryTable(sortedBrands, 'Brands', pageY);
    }
    
    // Page 2: Supplier summary table (if suppliers exist)
    if (suppliersInScope.length > 0) {
      doc.addPage();
      let pageY = 60;
      doc.setFontSize(22);
      doc.text('Activity Summary Across All Suppliers', 40, pageY);
      pageY += 30;
      doc.setFontSize(14);
      doc.text(dateRangeText, 40, pageY);
      pageY += 20;
      
      // Sort suppliers alphabetically
      const sortedSuppliers = [...suppliersInScope].sort((a, b) => a.localeCompare(b));
      createSummaryTable(sortedSuppliers, 'Suppliers', pageY);
    }
    
    // Individual company pages - brands first, then suppliers
    const allCompaniesInOrder = [...brandsInScope, ...suppliersInScope];
    for (let i = 0; i < allCompaniesInOrder.length; i++) {
      const company = allCompaniesInOrder[i];
      if (i > 0 || brandsInScope.length > 0 || suppliersInScope.length > 0) {
        doc.addPage();
      }
      let pageY = 60;
      
      // Determine if this is a brand or supplier
      const companyRole = originalRows.find(row => row['Company'] === company)?.['Role'] || 'Unknown';
      const rolePrefix = companyRole === 'Brand' ? 'Brand: ' : 'Supplier: ';
      
      doc.setFontSize(22);
      doc.text(`${rolePrefix}${company}`, 40, pageY);
      pageY += 30;
      doc.setFontSize(14);
      doc.text(dateRangeText, 40, pageY);
      pageY += 20;
      
      // Use all available data for this company from the original upload
      const allRowsForCompany = originalRows.filter((r: any) => r['Company'] === company);
      // Get activity types for table, sort alphabetically, and add 'Total Activities' as last row
      let activityTypesForTable = numericColumns.filter(col => col !== 'Total Activities').sort((a, b) => a.localeCompare(b));
      activityTypesForTable.push('Total Activities');
      // Build table head
      const head = [
        [
          'Activity Type',
          ...periods.flatMap(p => [`${p}d Avg`, `${p}d Actual`])
        ]
      ];
      // Build table body
      const body = activityTypesForTable.map(activity => {
        const row = [activity];
        periods.forEach(period => {
          const start = new Date(end.getTime() - (period - 1) * msPerDay);
          const periodRows = allRowsForCompany.filter((r: any) => {
            const d = parseDateString(r['Date']);
            return d >= start && d <= end;
          });
          const actual = periodRows.reduce((acc: number, r: any) => acc + (Number(r[activity]) || 0), 0);
          const avg = actual / period;
          row.push(avg.toFixed(1), actual.toString());
        });
        return row;
      });
      // Render table with jsPDF-AutoTable
      autoTable(doc, {
        head,
        body,
        startY: pageY,
        theme: 'grid',
        headStyles: { fillColor: [224, 224, 224], textColor: 20, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', fontSize: 12 },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        styles: { cellPadding: 6, font: 'helvetica' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: 40, right: 40 },
        didParseCell: function (data) {
          // Highlight the 'Total Activities' row like the header
          if (data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [224, 224, 224];
            data.cell.styles.fontStyle = 'bold';
          }
          // Indicator colors for Avg/Actual cells (not for header or first column)
          if (data.row.section === 'body' && data.column.index > 0 && data.row.index < body.length - 1) {
            const colIdx = data.column.index - 1; // skip Activity Type
            const periodIdx = Math.floor(colIdx / 2);
            const isAvg = colIdx % 2 === 0;
            // Only apply color to Avg columns
            if (isAvg && periodIdx < periods.length - 1) {
              const thisVal = parseFloat(String(data.cell.raw));
              const nextVal = parseFloat(String(body[data.row.index][1 + (periodIdx + 1) * 2]));
              if (!isNaN(thisVal) && !isNaN(nextVal)) {
                if (thisVal > nextVal) {
                  data.cell.styles.textColor = [0, 128, 0]; // green
                } else if (thisVal < nextVal) {
                  data.cell.styles.textColor = [220, 38, 38]; // red
                } else {
                  data.cell.styles.textColor = [234, 179, 8]; // yellow
                }
              }
            }
          }
          // Bold right border after first column and every 2 columns (after each period)
          if (
            data.column.index === 0 ||
            (data.column.index > 0 && (data.column.index - 1) % 2 === 1)
          ) {
            data.cell.styles.lineWidth = { right: 1.5 };
            data.cell.styles.lineColor = [0, 0, 0];
          }
        },
      });
      // Add legend below table
      const legendY = (doc as any).lastAutoTable.finalY + 18;
      doc.setFontSize(12);
      doc.text('Legend: Avg = average per calendar day in period, Actual = total events in period', 40, legendY);
      doc.text('Colour meaning: Green = higher than next period, Red = lower, Yellow = same as next period.', 40, legendY + 16);
    }
    // Generate a filename similar to chart export, but without timestamp
    const { chartData } = aggregateChartDataSeries(filteredRows, 'Total Activities');
    const { start: startDate, end: endDate } = getDateRange(chartData);
    const filterCode = getFilterCode();
    const filename = `Activity_Table_${filterCode}_${startDate}_${endDate}.pdf`;
    doc.save(filename);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FrankAI Analytics Tool
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* File Upload Area */}
        <Paper elevation={2} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            1. Upload CSV File
          </Typography>
          <Button variant="contained" component="label">
            Upload CSV
            <input type="file" accept=".csv" hidden onChange={handleFileChange} />
          </Button>
          {fileName && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected file: {fileName}
            </Typography>
          )}
        </Paper>

        {/* Data Table Preview */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>
                Data Table Preview
              </Typography>
              {/* Summary Counts - always visible */}
              {(filteredRows.length > 0) && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                    ✓ {successfulRows.length} successful
                  </Typography>
                  {unsuccessfulRows.length > 0 && (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      ✗ {unsuccessfulRows.length} unsuccessful
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            <Button
              size="small"
              startIcon={dataTableOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setDataTableOpen((v) => !v)}
            >
              {dataTableOpen ? 'Hide' : 'Show'}
            </Button>
          </Box>
          {dataTableOpen && (
            <>
              {/* Detailed Summary Counts */}
              {(filteredRows.length > 0) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <b>Records successfully uploaded:</b> {successfulRows.length}
                  </Typography>
                  <Typography variant="body2">
                    <b>Records unsuccessful:</b> {unsuccessfulRows.length}
                  </Typography>
                  <Typography variant="body2">
                    <b>Total errors:</b> {totalErrors}
                  </Typography>
                  <Typography variant="body2">
                    <b>Total warnings:</b> {totalWarnings}
                  </Typography>
                  {(totalErrors > 0 || totalWarnings > 0) && (
                    <Button size="small" sx={{ mt: 1 }} onClick={() => setShowDetails(v => !v)}>
                      {showDetails ? 'Hide details' : 'Show details'}
                    </Button>
                  )}
                </Box>
              )}
              {/* Collapsible Error/Warning List */}
              {showDetails && errors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {errors.map((err, idx) => (
                    <Alert severity={err.includes('warning') ? 'warning' : 'error'} key={idx}>{err}</Alert>
                  ))}
                </Box>
              )}
              <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  getCellClassName={(params: GridCellParams) => {
                    const row = filteredRows[params.row.id];
                    if (row && row._rowErrors && row._rowErrors.length > 0) {
                      return 'error-row';
                    }
                    return '';
                  }}
                  disableRowSelectionOnClick
                />
              </div>
            </>
          )}
        </Paper>

        {/* Date Range Picker */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2. Select Date Range
          </Typography>
          {/* Date Range Presets (moved inside card) */}
          {minDate && maxDate && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {presets.map((preset) => {
                const [presetStart, presetEnd] = preset.getRange(minDate as Date, maxDate as Date);
                // Disable if preset range is outside data
                const isDisabled = presetStart > maxDate || presetEnd < minDate;
                return (
                  <Button
                    key={preset.label}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 5, textTransform: 'none' }}
                    disabled={isDisabled}
                    onClick={() => setDateRange([presetStart, presetEnd])}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </Box>
          )}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
            <DateRangePicker
              value={dateRange}
              minDate={minDate ?? undefined}
              maxDate={maxDate ?? undefined}
              onChange={(newValue: [Date | null, Date | null]) => setDateRange(newValue)}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
              sx={{ mb: 2 }}
            />
          </LocalizationProvider>
        </Paper>

        {/* Entity Selection */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            3. Select Companies
          </Typography>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend">Entity Selection:</FormLabel>
            <RadioGroup
              value={entityFilterType}
              onChange={(e) => {
                setEntityFilterType(e.target.value as 'all' | 'brands' | 'suppliers' | 'specific');
                if (e.target.value !== 'specific') {
                  setSelectedCompanies([]);
                }
              }}
            >
              <FormControlLabel value="all" control={<Radio />} label="All Brands and Suppliers" />
              <FormControlLabel value="brands" control={<Radio />} label="All Brands Only" />
              <FormControlLabel value="suppliers" control={<Radio />} label="All Suppliers Only" />
              <FormControlLabel value="specific" control={<Radio />} label="Select Specific" />
            </RadioGroup>
            
            {entityFilterType === 'specific' && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <FormLabel>Select Companies:</FormLabel>
                  <Select
                    multiple
                    value={selectedCompanies}
                    onChange={(e) => setSelectedCompanies(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {(() => {
                      const companies = Array.from(new Set(rows.map(row => row.Company))).sort();
                      return companies.map((company) => (
                        <MenuItem key={company} value={company}>
                          {company}
                        </MenuItem>
                      ));
                    })()}
                  </Select>
                </FormControl>
              </Box>
            )}
          </FormControl>
        </Paper>
        {/* Chart Section */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          {/* Series selection and running total controls */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={showAllSeries}>
              <InputLabel id="series-select-label">Data Series</InputLabel>
              <Select
                labelId="series-select-label"
                value={selectedSeries}
                label="Data Series"
                onChange={e => setSelectedSeries(e.target.value)}
              >
                {numericColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showAllSeries}
                  onChange={e => setShowAllSeries(e.target.checked)}
                  color="primary"
                  disabled={(() => {
                    // Only enable if a single company is selected
                    const { chartData, companies } = aggregateChartDataSeries(filteredRows, selectedSeries);
                    return companies.length !== 1;
                  })()}
                />
              }
              label="Show All Data Series"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showRunningTotal}
                  onChange={e => setShowRunningTotal(e.target.checked)}
                  color="primary"
                />
              }
              label="Show Running Total"
            />
          </Box>
          <div id="chart-section-export" style={{ position: 'relative', background: '#fff', paddingBottom: 32 }}>
            <Typography variant="subtitle1" gutterBottom>
              Activity Timeline Chart
            </Typography>
            {filteredRows.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Showing: {getFilterDescription()} | Series: {showAllSeries ? 'All Data Series' : selectedSeries}{showRunningTotal ? ' + Running Total' : ''}
              </Typography>
            )}
            {filteredRows.length === 0 ? (
              <Typography variant="body2">
                {dateRange[0] && dateRange[1] 
                  ? "No data found for selected date range and entity filters." 
                  : "No data in selected date range."}
              </Typography>
            ) : (
              (() => {
                // If showAllSeries and only one company, plot all numeric columns for that company
                const { chartData, companies } = aggregateChartDataSeries(filteredRows, selectedSeries);
                let linesToPlot = [];
                let chartDataToUse = chartData;
                const colors = [
                  '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f',
                  '#0097a7', '#f57c00', '#512da8', '#00796b', '#c62828', '#0288d1', '#fbc02d', '#388e3c', '#1976d2', '#d32f2f'
                ];
                if (showAllSeries && companies.length === 1) {
                  // Build chartData with all numeric columns for the single company
                  chartDataToUse = chartData.map(row => {
                    const entry: Record<string, any> = { Date: row.Date };
                    numericColumns.forEach(col => {
                      entry[col] = filteredRows.find(r => r['Date'] === row.Date && r['Company'] === companies[0])?.[col] || 0;
                    });
                    return entry;
                  });
                  linesToPlot = numericColumns;
                } else {
                  linesToPlot = companies;
                }
                // Running total data
                let runningTotalData: any[] = [];
                if (showRunningTotal) {
                  runningTotalData = getAggregateRunningTotalData(chartData, companies);
                }
                return (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartDataToUse} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="Date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {linesToPlot.map((lineKey, idx) => (
                        <Line
                          key={lineKey}
                          type="monotone"
                          dataKey={lineKey}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                      {showRunningTotal && runningTotalData.length > 0 && (
                        <Line
                          key="RunningTotal"
                          type="monotone"
                          data={runningTotalData}
                          dataKey="RunningTotal"
                          stroke="#d32f2f"
                          strokeWidth={3}
                          dot={false}
                          isAnimationActive={false}
                          strokeDasharray="8 4"
                          name={"Aggregate Running Total"}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()
            )}
            {/* Watermark */}
            <div style={{ position: 'absolute', right: 8, bottom: 8, opacity: 0.5, fontSize: 12, color: '#888' }}>
              FrankAI Analytics Tool
            </div>
          </div>
          <Box sx={{ textAlign: 'center', mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleExport} disabled={filteredRows.length === 0}>
              Export to PNG (Recharts)
            </Button>
            <Button variant="contained" color="secondary" onClick={handleExportPlotly} disabled={filteredRows.length === 0}>
              Export to PNG (Plotly)
            </Button>
          </Box>
        </Paper>
        {/* Action Buttons */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleGenerateReports} disabled={filteredRows.length === 0 || generatingPDF}>
              {generatingPDF ? 'Generating PDF...' : 'Generate Reports'}
            </Button>
            <Button variant="contained" color="primary" onClick={handleGenerateTrendTablesPDF}>Generate Trend Tables PDF</Button>
            <Button variant="outlined" onClick={() => {
              setEntityFilterType('all');
              setSelectedCompanies([]);
              setDateRange([null, null]);
            }}>
              Clear Selection
            </Button>
            <Button variant="outlined" disabled>
              Settings
            </Button>
          </Box>
        </Paper>
        {/* Snackbar notification */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={`Chart exported as PNG using ${exportMethod === 'recharts' ? 'Recharts' : 'Plotly'}!`}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
      {/* Error row styling */}
      <style>{`
        .error-row {
          background-color: #ffebee;
        }
      `}</style>
    </Box>
  );
}

export default App;
