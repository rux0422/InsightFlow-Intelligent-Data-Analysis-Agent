# InsightFlow
Your Intelligent Data Analysis Agent.
From Files to Insights, Instantly. (supports .pdf, .csv and Excel files)

## What is InsightFlow?

InsightFlow is an AI-powered tool that helps you obtain insights and information from the files you upload. Simply upload your CSV, Excel, or PDF files, and get instant insights or answers to your questions.

 Demo video of the tool: https://drive.google.com/file/d/1PiBnqeybZKg1kKqh_YzmHRbBYJ2XMKZF/view

**What makes InsightFlow different:**
- **For Data Files (CSV/Excel)**: Get a comprehensive data science report automatically - no questions needed! The AI analyzes your entire dataset and provides detailed statistics, identifies patterns, detects outliers, and recommends machine learning algorithms suited for your data.
- **For PDF Documents**: Ask questions and get intelligent answers based on the document's content.
- **Two Ways to Use**: Choose between a simple terminal interface (CLI) or a modern web browser interface.

## What Can InsightFlow Do?

### For CSV and Excel Files

When you upload a CSV or Excel file, InsightFlow automatically generates a complete data science analysis report that includes:

**Basic Statistics:**
- Total number of rows and columns
- Data completeness (missing values count)
- Column data types (numeric, text, dates, etc.)

**Advanced Statistical Analysis:**
- Mean, median, mode for numeric columns
- Standard deviation and variance
- Range (minimum and maximum values)
- Quartiles (Q1, Q3) and Interquartile Range (IQR)
- Outlier detection using statistical methods
- Distribution patterns (whether data is skewed left, right, or symmetric)

**Data Quality Insights:**
- Duplicate row detection
- Missing value analysis
- Data consistency checks
- Cardinality analysis for categorical columns

**Machine Learning Recommendations:**
Based on your data characteristics, InsightFlow suggests:
- Which ML algorithms would work best (XGBoost, Random Forest, Neural Networks, etc.)
- Why each algorithm is suitable for your specific dataset
- Sample size considerations

**Data Preprocessing Guidance:**
- Scaling methods (StandardScaler, RobustScaler)
- Encoding strategies for categorical variables
- Imputation methods for missing values
- Transformation suggestions (log, Box-Cox, power transforms)
- Feature engineering ideas

**All this analysis is:**
- Presented in clear, professional English (not technical code)
- Available as a downloadable PDF report (multiple pages)
- Generated automatically - you don't have to ask questions

### For PDF Documents

When you upload a PDF file, you can:
- Ask questions about the document content
- Get summaries of specific sections
- Extract key information
- Search for specific topics
- Get the AI to explain complex parts

## Getting Started

### Prerequisites

- [Deno](https://docs.deno.com/runtime/getting_started/installation/) installed on your system. Install the Deno extension on your VS Code IDE as well.
- Anthropic API Key

### Installation

1. Clone this repository and navigate to it.
2. Add Zypher Agent to your project (on Powershell) and run the following commands:
      ```
      deno add jsr:@corespeed/zypher
      deno add npm:rxjs-for-await
      ```
4. Run the below commands (on Powershell):
    ```
    deno cache main.ts, 
    deno cache launcher.ts, 
    deno cache webServer.ts
    ```
6. Create a `.env` file with your API key. Your API key can be obtained by creating one here https://www.claude.com/platform/api:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

5. Create the `uploads` directory:

```bash
mkdir uploads
```

## How to Use InsightFlow

### Starting the Application

You have three ways to start InsightFlow:

**Option 1: Choose Your Mode (Recommended)**
```bash
deno task start
```
You'll see a menu where you can select CLI or Web mode.

**Option 2: Launch CLI Mode Directly**
```bash
deno task cli
```

**Option 3: Launch Web Mode Directly**
```bash
deno task web
```
Then open your browser to `http://localhost:8000`

## CLI Mode (Terminal Interface)

### How It Works

1. **Start the application** in CLI mode
2. **See your uploaded files** - The application will show all files in the `uploads` folder
3. **Select a file** by typing its number or name

**If you selected a CSV or Excel file:**
- The AI immediately analyzes your entire dataset
- You'll see a comprehensive data science report on your screen
- You'll be asked if you want to save it as a PDF
- After viewing/saving, you can analyze another file or exit

**If you selected a PDF:**
- You can start asking questions about the document
- The AI will answer based on the PDF's content
- Type `new file` to switch to a different file
- Type `exit` to quit

### Example CLI Session (CSV/Excel)

```
Files in uploads folder:
1. sales_data.csv (450 KB)
2. customer_report.xlsx (1.2 MB)
3. financial_statement.pdf (890 KB)

Enter file number or name: 1

✅ Processing sales_data.csv...

======================================================================
📊 DATA SCIENCE ANALYSIS REPORT
======================================================================

DATASET OVERVIEW
The dataset contains 5,423 rows and 12 columns with 99.8% data completeness...

STATISTICAL SUMMARY
The numeric columns show varied distributions. The "Sales Amount" column
has a mean of $45,230 with a standard deviation of $12,450...

[Full detailed analysis displayed...]

💾 Would you like to save this report as PDF? (yes/no): yes
✅ PDF saved to: insights_sales_data_1234567890.pdf

What would you like to do next?
1. Select another file from uploads folder
2. Upload a new file to analyze
3. Exit

Enter your choice (1-3):
```

### Example CLI Session (PDF)

```
Enter file number or name: 3

✅ Processing financial_statement.pdf...
✅ PDF loaded: 15 pages, 3 tables detected

You can now ask questions about this document!

Your question: What is the total revenue mentioned?

🤔 Processing your question...

According to the financial statement, the total revenue for Q4 2024 was
$2.5 million, representing a 15% increase from the previous quarter...

Your question: new file

[Returns to file selection...]
```

## Web Mode (Browser Interface)

### How It Works

1. **Start web server mode** and open `http://localhost:8000` in your browser
2. **Upload files** using the upload button or select from existing files
3. **Click on a file** to process it

**For CSV/Excel files:**
- Click the "Extract Insights" button
- A modal window opens showing your complete data analysis
- Click "Download PDF" to save the full report
- The report includes all pages of analysis

**For PDF files:**
- Click "Start Asking Questions"
- Type your questions in the chat interface
- Get intelligent answers in real-time

### Web Interface Features

**Sidebar:**
- List of all uploaded files with size and type
- Upload button for adding new files
- File type badges (CSV, XLSX, PDF)
- Delete files you no longer need

**Main Area (for CSV/Excel):**
- File details (rows, columns, headers)
- "Extract Insights" button
- Insights displayed in a scrollable modal
- "Download PDF" button for the complete multi-page report

**Main Area (for PDFs):**
- Chat interface for questions
- Message history
- Typing indicators
- Real-time AI responses

## Understanding the Data Science Report

When you analyze a CSV or Excel file, the report is written in clear English (not code) and includes:

### 1. Dataset Overview Section
Plain English description of your data:
- How many rows and columns
- Overall data quality
- Types of data present

### 2. Statistical Analysis Section
For each numeric column, you get:
- Average value and what it means
- How spread out the data is
- Minimum and maximum values
- Middle values (median, quartiles)
- Whether there are unusual values (outliers)

### 3. Data Distribution Analysis
Explains if your data is:
- Evenly distributed (symmetric)
- Mostly small values with few large ones (right-skewed)
- Mostly large values with few small ones (left-skewed)

### 4. Data Quality Assessment
Reports on:
- Any missing information
- Duplicate entries
- Consistency issues
- Completeness percentage

### 5. Machine Learning Recommendations
Suggests which algorithms to use and why:
- For classification problems
- For regression (predicting numbers)
- For clustering (grouping similar items)
- Sample size considerations

### 6. Preprocessing Recommendations
Step-by-step guidance for preparing your data:
- How to handle missing values
- How to scale numeric features
- How to encode categorical variables
- Transformation suggestions

## Supported File Formats

### CSV Files (.csv)
- Standard comma-separated values
- Any size (the tool processes everything)
- First row should be column headers

### Excel Files (.xlsx, .xls)
- Modern Excel format (.xlsx)
- Legacy Excel format (.xls)
- Automatically reads all sheets
- Any number of rows and columns

### PDF Files (.pdf)
- Text-based PDFs (best results)
- Scanned PDFs (limited accuracy)
- Automatically extracts tables
- Any length document

## Project Structure

```
InsightFlow/
├── launcher.ts          # Mode selection entry point
├── main.ts              # CLI mode implementation
├── webServer.ts         # Web server implementation
├── customTools.ts       # Data processing tools
├── pdfTool.ts          # PDF extraction tool
├── tableTool.ts        # Table processing and insights generation
├── storageTool.ts      # Data storage utilities
├── deno.json           # Deno configuration
├── .env                # Your API key (you create this)
├── web/                # Web interface files
│   ├── index.html      # Main HTML
│   ├── styles.css      # Styling
│   └── app.js          # Frontend JavaScript
├── uploads/            # Put your files here
└── extracted_data/     # Processed data storage
```

## Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here
```

### Port Configuration
The web server runs on port 8000 by default. If this port is busy, the system will automatically try ports 8001, 8002, 8003, 8080, 8888, or 3000.

## Available Commands

```bash
# Start with mode selection menu
deno task start

# Launch CLI mode directly
deno task cli

# Launch web server directly
deno task web

# Development mode with auto-reload
deno task dev
```

## Troubleshooting

### "Environment variable ANTHROPIC_API_KEY is not set"
**Solution:**
- Create a file named `.env` in the project folder
- Add this line: `ANTHROPIC_API_KEY=your_actual_api_key`
- Replace `your_actual_api_key` with your real API key from Anthropic

### "No files found in uploads folder"
**Solution:**
- Create the `uploads` folder: `mkdir uploads`
- Put your CSV, Excel, or PDF files in this folder
- Restart the application

### Web server not starting
**Solution:**
- The app will automatically try different ports if 8000 is busy
- Check the terminal for which port it's using
- Open your browser to that port (e.g., `http://localhost:8001`)

### File processing fails
**Possible reasons:**
- File format not supported (use CSV, XLSX, XLS, or PDF only)
- File is corrupted or unreadable
- File is too large (try a smaller file)
- File doesn't have proper read permissions

### PDF questions not working well
**Tips:**
- Use text-based PDFs (not scanned images)
- Be specific in your questions
- Reference specific sections or page numbers
- Break complex questions into simpler ones


## Technologies Used

- **Runtime**: Deno (modern JavaScript/TypeScript runtime)
- **AI**: Anthropic Claude AI (via Zypher Agent framework)
- **PDF Processing**: Custom PDF parser
- **CSV Processing**: Papa Parse library
- **Excel Processing**: SheetJS library
- **Frontend**: Pure JavaScript, HTML5, CSS3 (no frameworks needed)
- **Statistics**: Built-in statistical calculations

---

**Need help? Have questions? Check the QUICKSTART.md file for a quick guide!**

**Enjoy analyzing your data with AI! 🚀**
