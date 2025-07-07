import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Paper, Button, Alert, FormControl, FormControlLabel, Radio, RadioGroup, FormLabel, Select, MenuItem, Chip, OutlinedInput } from '@mui/material';
import { DataGrid, GridColDef, GridCellParams } from '@mui/x-data-grid';
import Papa, { ParseResult } from 'papaparse';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import Snackbar from '@mui/material/Snackbar';
import { DateRangePicker } from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { enGB } from 'date-fns/locale';
import { parse as parseDate, isAfter, isBefore, isEqual } from 'date-fns';

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

function App() {
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  
  // Entity selection state
  const [entityFilterType, setEntityFilterType] = useState<'all' | 'brands' | 'suppliers' | 'specific'>('all');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

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

  // Export chart section to PNG
  const handleExport = () => {
    const chartSection = document.getElementById('chart-section-export');
    if (!chartSection) return;
    html2canvas(chartSection, { backgroundColor: '#fff', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      // Get date range for filename
      const { chartData } = aggregateChartData(filteredRows);
      const { start, end } = getDateRange(chartData);
      const now = new Date();
      const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const filterCode = getFilterCode();
      link.download = `AT_${filterCode}_${start}_${end}_${hhmmss}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSnackbarOpen(true);
    });
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

        {/* Available Analyses */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Available Analyses
          </Typography>
          <Box>
            <FormControlLabel
              control={<input type="checkbox" defaultChecked disabled />}
              label="Activity Timeline Graph"
            />
            <FormControlLabel
              control={<input type="checkbox" disabled />}
              label="User Engagement Heatmap (Coming Soon)"
            />
            <FormControlLabel
              control={<input type="checkbox" disabled />}
              label="Feature Adoption Chart (Coming Soon)"
            />
          </Box>
        </Paper>
        {/* Date Range Picker */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2. Select Date Range
          </Typography>
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
        {/* Data Table Preview */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Data Table Preview
          </Typography>
          {/* Summary Counts */}
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
        </Paper>
        {/* Chart Section */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <div id="chart-section-export" style={{ position: 'relative', background: '#fff', paddingBottom: 32 }}>
            <Typography variant="subtitle1" gutterBottom>
              Activity Timeline Chart
            </Typography>
            {filteredRows.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Showing: {getFilterDescription()}
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
                const { chartData, companies } = aggregateChartData(filteredRows);
                if (chartData.length === 0 || companies.length === 0) {
                  return <Typography variant="body2">No valid data to display.</Typography>;
                }
                const colors = [
                  '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f',
                  '#0097a7', '#f57c00', '#512da8', '#00796b', '#c62828', '#0288d1', '#fbc02d', '#388e3c', '#1976d2', '#d32f2f'
                ];
                return (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="Date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {companies.map((company, idx) => (
                        <Line
                          key={company}
                          type="monotone"
                          dataKey={company}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
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
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="contained" onClick={handleExport} disabled={filteredRows.length === 0}>
              Export to PNG
            </Button>
          </Box>
        </Paper>
        {/* Action Buttons */}
        <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleExport} disabled={filteredRows.length === 0}>
              Generate Reports
            </Button>
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
          message="Chart exported as PNG!"
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
