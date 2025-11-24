# Quick Start Guide

Get InsightFlow running in 3 simple steps and start analyzing your data!

## What You'll Get

**For CSV/Excel Files:**
- Automatic data science report (no questions needed!)
- Complete statistical analysis
- Machine learning recommendations
- Downloadable PDF report

**For PDF Documents:**
- Ask questions and get instant answers
- Document summarization
- Information extraction

## Step 1: Start the Application

Open your terminal and run:

```bash
deno task start
```

## Step 2: Choose Your Mode

You'll see a menu like this:

```
======================================================================
           🚀 InsightFlow
           Your Intelligent Data Analysis Agent.
           From Files to Insights, Instantly. (supports .pdf, .csv and Excel files)
======================================================================

   Select your preferred mode:

   1. 🖥️  CLI Mode - Command-line interface for terminal users
   2. 🌐 Web Server Mode - Visual web interface

======================================================================

Enter your choice (1 or 2):
```

### Option 1: CLI Mode (Terminal)

**Best for:**
- Quick analysis
- Terminal users
- Automated workflows
- Server environments

**What happens:**
- Shows list of files in your `uploads` folder
- You select a file
- **CSV/Excel**: Displays full analysis report → Option to save as PDF → Pick another file
- **PDF**: Ask questions → Get answers → Switch files anytime

### Option 2: Web Mode (Browser)

**Best for:**
- Visual interface
- Multiple files
- Easier navigation
- Better readability

**What happens:**
- Opens browser at `http://localhost:8000`
- Click on files to process them
- **CSV/Excel**: Click "Extract Insights" → View report in modal → Download PDF
- **PDF**: Click "Start Asking Questions" → Chat interface → Ask anything

## Step 3: Analyze Your Data

### For CSV/Excel Files (Automatic Analysis)

**CLI Mode Example:**
```
Files in uploads folder:
1. sales_data.csv (450 KB)
2. financial_report.xlsx (1.2 MB)

Enter file number or name: 1

✅ Processing sales_data.csv...

======================================================================
📊 DATA SCIENCE ANALYSIS REPORT
======================================================================

DATASET OVERVIEW
The dataset contains 5,423 rows and 12 columns with 99.8% completeness.
The data includes 8 numeric columns and 4 categorical columns...

STATISTICAL ANALYSIS

Sales Amount Column:
The Sales Amount column shows a mean of $45,230 with a standard deviation
of $12,450. The median value is $42,100, indicating a slight right skew...

[Complete analysis with all statistics, outliers, recommendations...]

💾 Would you like to save this report as PDF? (yes/no): yes
✅ PDF saved to: insights_sales_data_1703012345.pdf

What would you like to do next?
1. Select another file from uploads folder
2. Upload a new file to analyze
3. Exit
```

**Web Mode:**
1. Click on `sales_data.csv` in the file list
2. Click "Extract Insights" button
3. Read the complete analysis in the modal window
4. Click "Download PDF" to save the full multi-page report

### For PDF Files (Question & Answer)

**CLI Mode Example:**
```
Enter file number or name: 2

✅ Processing research_paper.pdf...
✅ PDF loaded: 25 pages, 5 tables detected

You can now ask questions about this document!

Your question: What is the main finding of this research?

🤔 Processing your question...

The main finding is that the new treatment showed a 45% improvement
in patient outcomes compared to the control group, with statistical
significance (p < 0.01)...

Your question: What were the limitations?

🤔 Processing your question...

The study identified three main limitations: small sample size (n=120),
short follow-up period (6 months), and lack of long-term data...

Your question: new file
[Returns to file selection]
```

**Web Mode:**
1. Click on `research_paper.pdf` in the file list
2. Click "Start Asking Questions"
3. Type your questions in the chat box
4. Get instant answers from the AI
5. Continue the conversation or select another file

## Understanding Your Data Report (CSV/Excel)

When you analyze a CSV or Excel file, you get a comprehensive report with:

### 1. Dataset Overview
- Total rows and columns
- Data completeness percentage
- Types of data present

### 2. Column Analysis
For each column, you'll see:

**Numeric Columns:**
- Mean (average)
- Median (middle value)
- Standard deviation (spread)
- Min and max values
- Quartiles (Q1, Q3)
- Outliers detected
- Distribution pattern (skewed left/right/symmetric)

**Text/Categorical Columns:**
- Unique values count
- Most common values
- Data consistency
- Missing values

### 3. Data Quality Assessment
- Missing values report
- Duplicate rows detection
- Data consistency checks
- Completeness score

### 4. Machine Learning Recommendations
Based on your data, the report suggests:
- Best algorithms to use (XGBoost, Random Forest, etc.)
- Why each algorithm fits your data
- Sample size considerations
- Model selection tips

### 5. Preprocessing Steps
Clear guidance on:
- How to handle missing values
- Scaling methods (StandardScaler, RobustScaler)
- Encoding categorical variables
- Transformation suggestions
- Feature engineering ideas

**Everything is explained in plain English - no code required!**

## Example Questions for PDFs

Here are some great questions to ask about PDF documents:

### General Understanding
- "What is this document about?"
- "Summarize the main points"
- "What are the key findings?"

### Specific Information
- "What does it say about [topic]?"
- "What are the statistics mentioned?"
- "List all the recommendations"
- "What conclusions were drawn?"

### Detailed Analysis
- "What methodology was used?"
- "What are the limitations?"
- "Who are the authors and what are their affiliations?"
- "What future research is suggested?"

## Quick Tips

### 1. File Preparation
- Put files in the `uploads` folder before starting
- Use clear, descriptive filenames
- For CSV/Excel: Make sure first row has column headers
- For PDFs: Text-based PDFs work best

### 2. Getting Better Results

**For Data Files:**
- Clean your data (remove empty rows)
- Use consistent formatting
- Have clear column names
- The tool analyzes ALL your data automatically

**For PDFs:**
- Ask specific questions
- Reference specific sections when needed
- One question at a time for clarity
- Build on previous answers

### 3. Saving Your Work
- **CLI Mode**: Say "yes" when asked to save PDF report
- **Web Mode**: Click "Download PDF" button in the insights modal
- PDFs include multiple pages with complete analysis

## Common Commands

```bash
# Start with mode selection (recommended)
deno task start

# Go directly to CLI mode
deno task cli

# Go directly to Web mode
deno task web
```

### In CLI Mode:
- **Select file**: Type number or filename
- **Switch files**: Type `new file`
- **Exit**: Type `exit`
- **Save PDF**: Type `yes` when prompted

### In Web Mode:
- **Upload**: Click "Upload File" button
- **Process**: Click on any file in the list
- **Delete**: Click the 🗑️ icon next to a file
- **Navigate**: Use browser back/forward buttons

## Troubleshooting

### I don't see any files
**Solution**: Put your CSV, Excel, or PDF files in the `uploads` folder

### The web page won't load
**Solution**: Check the terminal - it might be using a different port like 8001 or 8002

### Analysis seems incomplete
**Solution**: For CSV/Excel, the tool processes everything automatically. Wait for the full report.

### PDF answers aren't accurate
**Solution**: Make sure you're using a text-based PDF (not a scanned image)

### Port already in use
**Solution**: The app automatically finds an available port. Check terminal for the actual port number.

## What's Next?

1. **Try it out**: Upload a sample file and see the analysis
2. **Explore features**: Try both CLI and Web modes
3. **Save reports**: Download PDFs for future reference
4. **Multiple files**: Analyze different datasets back-to-back

## Need More Help?

- Check the full **README.md** for detailed documentation
- Make sure your `.env` file has your Anthropic API key
- Ensure the `uploads` folder exists

---

**Start analyzing your data in seconds! 🚀**

**Happy analyzing! 🎉**
