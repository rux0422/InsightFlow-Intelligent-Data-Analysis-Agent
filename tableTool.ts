import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface TableData {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export class TableProcessor {
  async processCSV(filePath: string): Promise<TableData> {
    try {
      const content = await Deno.readTextFile(filePath);
      
      const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        trimHeaders: true,
      });

      if (!result.data || result.data.length === 0) {
        throw new Error("No data found in CSV file");
      }

      const headers = (result.meta.fields || []).map((h: string) => h.trim());
      
      const rows = result.data.map((row: Record<string, any>) =>
        headers.map((header: string) => {
          const value = row[header];
          return value !== null && value !== undefined ? String(value).trim() : "";
        })
      );

      return {
        headers,
        rows,
        rowCount: rows.length,
      };
    } catch (error) {
      throw new Error(`Failed to process CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processExcel(filePath: string): Promise<TableData> {
    try {
      const fileData = await Deno.readFile(filePath);
      const workbook = XLSX.read(fileData, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      
      if (jsonData.length === 0) {
        throw new Error("No data found in Excel file");
      }
      
      const headers = jsonData[0].map((h: any) => String(h).trim());
      const rows = jsonData.slice(1)
        .filter((row: any[]) => row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== ""))
        .map((row: any[]) =>
          headers.map((_: string, idx: number) => {
            const cell = row[idx];
            return cell !== null && cell !== undefined ? String(cell).trim() : "";
          })
        );

      return {
        headers,
        rows,
        rowCount: rows.length,
      };
    } catch (error) {
      throw new Error(`Failed to process Excel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  queryData(data: TableData, query: string): string {
    return `Table Data (${data.rowCount} rows):\nHeaders: ${data.headers.join(", ")}\n\nFirst 10 rows:\n${
      data.rows.slice(0, 10).map((row: string[], idx: number) => 
        `Row ${idx + 1}: ${row.join(" | ")}`
      ).join("\n")
    }\n\nQuery: ${query}\n\nAnalyze this data and answer the query.`;
  }

  filterRows(data: TableData, columnName: string, value: string): string[][] {
    const colIndex = this.findColumnIndex(data.headers, columnName);
    if (colIndex === -1) {
      return [];
    }
    
    const lowerValue = value.toLowerCase().trim();
    return data.rows.filter((row: string[]) => {
      const cellValue = (row[colIndex] || "").toLowerCase().trim();
      return cellValue.includes(lowerValue) || lowerValue.includes(cellValue);
    });
  }

  filterRowsAdvanced(data: TableData, columnName: string, value: string, operator: string = "equals"): string[][] {
    const colIndex = this.findColumnIndex(data.headers, columnName);
    if (colIndex === -1) {
      return [];
    }

    return data.rows.filter((row: string[]) => {
      const cellValue = (row[colIndex] || "").trim();
      const numericCellValue = parseFloat(cellValue);
      const numericValue = parseFloat(value);

      switch (operator.toLowerCase()) {
        case "equals":
        case "=":
        case "==":
          return cellValue.toLowerCase() === value.toLowerCase().trim();
        
        case "contains":
          return cellValue.toLowerCase().includes(value.toLowerCase().trim());
        
        case "greater":
        case ">":
          return !isNaN(numericCellValue) && !isNaN(numericValue) && numericCellValue > numericValue;
        
        case "less":
        case "<":
          return !isNaN(numericCellValue) && !isNaN(numericValue) && numericCellValue < numericValue;
        
        case ">=":
          return !isNaN(numericCellValue) && !isNaN(numericValue) && numericCellValue >= numericValue;
        
        case "<=":
          return !isNaN(numericCellValue) && !isNaN(numericValue) && numericCellValue <= numericValue;
        
        case "not":
        case "!=":
          return cellValue.toLowerCase() !== value.toLowerCase().trim();
        
        default:
          return cellValue.toLowerCase().includes(value.toLowerCase().trim());
      }
    });
  }

  aggregateColumn(data: TableData, columnName: string, operation: "sum" | "avg" | "count" | "min" | "max"): number {
    const colIndex = this.findColumnIndex(data.headers, columnName);
    if (colIndex === -1) return 0;

    const values = data.rows
      .map((row: string[]) => parseFloat(row[colIndex]))
      .filter((val: number) => !isNaN(val));

    if (values.length === 0) return 0;

    switch (operation) {
      case "sum":
        return values.reduce((a: number, b: number) => a + b, 0);
      case "avg":
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      case "count":
        return values.length;
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      default:
        return 0;
    }
  }

  findColumnIndex(headers: string[], columnName: string): number {
    const lowerColumnName = columnName.toLowerCase().trim();
    
    // Exact match (case-insensitive)
    let index = headers.findIndex((h: string) => h.toLowerCase().trim() === lowerColumnName);
    if (index !== -1) return index;
    
    // Partial match
    index = headers.findIndex((h: string) => h.toLowerCase().trim().includes(lowerColumnName));
    if (index !== -1) return index;
    
    // Reverse partial match
    index = headers.findIndex((h: string) => lowerColumnName.includes(h.toLowerCase().trim()));
    if (index !== -1) return index;
    
    return -1;
  }

  getUniqueValues(data: TableData, columnName: string): string[] {
    const colIndex = this.findColumnIndex(data.headers, columnName);
    if (colIndex === -1) return [];

    const uniqueSet = new Set<string>();
    data.rows.forEach((row: string[]) => {
      const value = (row[colIndex] || "").trim();
      if (value) uniqueSet.add(value);
    });

    return Array.from(uniqueSet).sort();
  }

  groupBy(data: TableData, groupColumn: string, valueColumn: string, operation: "sum" | "avg" | "count"): Record<string, number> {
    const groupColIndex = this.findColumnIndex(data.headers, groupColumn);
    const valueColIndex = this.findColumnIndex(data.headers, valueColumn);
    
    if (groupColIndex === -1) return {};

    const groups: Record<string, number[]> = {};

    data.rows.forEach((row: string[]) => {
      const groupKey = (row[groupColIndex] || "").trim();
      if (!groupKey) return;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      if (valueColIndex !== -1) {
        const value = parseFloat(row[valueColIndex]);
        if (!isNaN(value)) {
          groups[groupKey].push(value);
        }
      } else {
        groups[groupKey].push(1); // For count operation
      }
    });

    const result: Record<string, number> = {};
    for (const [key, values] of Object.entries(groups)) {
      switch (operation) {
        case "sum":
          result[key] = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case "avg":
          result[key] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
          break;
        case "count":
          result[key] = values.length;
          break;
      }
    }

    return result;
  }

  searchInTable(data: TableData, searchTerm: string): string[][] {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    return data.rows.filter((row: string[]) => {
      return row.some((cell: string) =>
        (cell || "").toLowerCase().includes(lowerSearchTerm)
      );
    });
  }

  // Generate comprehensive data science analysis with technical insights
  generateInsights(data: TableData): string {
    const sections: string[] = [];

    // Title
    sections.push("DATA SCIENCE ANALYSIS REPORT");
    sections.push("Comprehensive Dataset Evaluation and Insights");
    sections.push("");
    sections.push("");

    // Executive Summary
    sections.push("EXECUTIVE SUMMARY");
    sections.push("");

    const totalCells = data.rowCount * data.headers.length;
    const emptyCount = data.rows.reduce((count, row) =>
      count + row.filter(cell => !cell || !cell.trim()).length, 0
    );
    const completeness = ((totalCells - emptyCount) / totalCells) * 100;

    sections.push(`This dataset comprises ${data.rowCount.toLocaleString()} observations across ${data.headers.length} distinct variables. The overall data completeness stands at ${completeness.toFixed(1)} percent, with ${(totalCells - emptyCount).toLocaleString()} populated values out of ${totalCells.toLocaleString()} total possible data points. This level of completeness indicates ${completeness >= 95 ? "excellent data quality suitable for advanced modeling" : completeness >= 80 ? "good data quality appropriate for most analytical tasks" : completeness >= 60 ? "moderate data quality requiring some preprocessing" : "limited data quality necessitating significant data cleaning"}.`);
    sections.push("");
    sections.push("");

    // Dataset Structure
    sections.push("DATASET STRUCTURE AND DIMENSIONALITY");
    sections.push("");
    sections.push(`The dataset contains ${data.headers.length} variables: ${data.headers.join(", ")}. With ${data.rowCount.toLocaleString()} observations and ${data.headers.length} features, the data dimensionality is ${data.headers.length / data.rowCount < 0.01 ? "low, which is favorable for most machine learning algorithms" : data.headers.length / data.rowCount < 0.1 ? "moderate, suitable for various modeling approaches" : "relatively high, which may benefit from dimensionality reduction techniques such as PCA or feature selection methods"}.`);
    sections.push("");
    sections.push("");

    // Detailed Variable Analysis
    sections.push("DETAILED VARIABLE ANALYSIS");
    sections.push("");

    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const skewedColumns: string[] = [];
    const outlierColumns: string[] = [];

    for (const header of data.headers) {
      const colIndex = data.headers.indexOf(header);
      const values = data.rows.map(row => row[colIndex]).filter(val => val && val.trim());

      if (values.length === 0) {
        sections.push(`Variable: ${header}`);
        sections.push(`This variable contains no populated values and requires data collection before analysis. Missing data imputation or feature removal should be considered.`);
        sections.push("");
        continue;
      }

      const uniqueValues = new Set(values);
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const isNumeric = numericValues.length > values.length * 0.5;
      const missingCount = data.rowCount - values.length;
      const missingPercent = ((missingCount / data.rowCount) * 100).toFixed(1);

      if (isNumeric) {
        numericColumns.push(header);
        const n = numericValues.length;
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const range = max - min;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        // Calculate standard deviation
        const squaredDiffs = numericValues.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate quartiles for IQR
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;

        // Detect outliers using IQR method
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
        const outlierPercent = ((outliers.length / n) * 100).toFixed(1);

        if (outliers.length > 0) {
          outlierColumns.push(header);
        }

        // Determine skewness
        const skewness = (mean - median) / (stdDev + 0.0001); // Add small value to avoid division by zero
        let skewDescription = "";
        if (Math.abs(mean - median) < stdDev * 0.1) {
          skewDescription = "approximately symmetric distribution";
        } else if (mean > median) {
          skewDescription = "right-skewed distribution (positive skew)";
          skewedColumns.push(`${header} (right-skewed)`);
        } else {
          skewDescription = "left-skewed distribution (negative skew)";
          skewedColumns.push(`${header} (left-skewed)`);
        }

        sections.push(`Variable: ${header} (Numeric)`);
        sections.push(`Statistical Summary: This continuous variable exhibits a range from ${min.toLocaleString(undefined, { maximumFractionDigits: 2 })} (minimum) to ${max.toLocaleString(undefined, { maximumFractionDigits: 2 })} (maximum), yielding a range of ${range.toLocaleString(undefined, { maximumFractionDigits: 2 })}. The central tendency measures include a mean of ${mean.toLocaleString(undefined, { maximumFractionDigits: 2 })} and median of ${median.toLocaleString(undefined, { maximumFractionDigits: 2 })}. The standard deviation is ${stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}, indicating ${stdDev / mean > 0.5 ? "high variability" : stdDev / mean > 0.2 ? "moderate variability" : "low variability"} in the data.`);
        sections.push("");
        sections.push(`Distribution Characteristics: The data exhibits ${skewDescription}. ${mean > median ? "The mean being higher than the median suggests that extreme high values are pulling the average upward, which is common in positively skewed distributions." : mean < median ? "The mean being lower than the median indicates that extreme low values are pulling the average downward, typical of negatively skewed distributions." : "The similarity between mean and median suggests a relatively symmetric distribution around the central value."}`);
        sections.push("");

        if (outliers.length > 0) {
          sections.push(`Outlier Detection: Using the Interquartile Range (IQR) method with Q1 at ${q1.toLocaleString(undefined, { maximumFractionDigits: 2 })} and Q3 at ${q3.toLocaleString(undefined, { maximumFractionDigits: 2 })}, we identified ${outliers.length.toLocaleString()} outliers (${outlierPercent} percent of observations). These values fall outside the range of ${lowerBound.toLocaleString(undefined, { maximumFractionDigits: 2 })} to ${upperBound.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Consider outlier treatment methods such as Winsorization, transformation, or removal depending on whether these represent genuine extreme values or data errors.`);
          sections.push("");
        }

        if (missingCount > 0) {
          sections.push(`Missing Data: ${missingCount.toLocaleString()} observations (${missingPercent} percent) contain missing values for this variable. ${parseFloat(missingPercent) > 5 ? `This significant level of missingness may require imputation techniques such as mean/median imputation, regression imputation, or multiple imputation methods. Alternatively, consider using algorithms that handle missing values naturally, such as XGBoost or LightGBM.` : `This relatively low level of missingness can be addressed through simple imputation methods or by using complete case analysis.`}`);
          sections.push("");
        } else {
          sections.push(`Data Completeness: This variable has no missing values, which is optimal for analysis.`);
          sections.push("");
        }
      } else {
        if (uniqueValues.size < values.length * 0.5 && uniqueValues.size > 1) {
          categoricalColumns.push(header);
        }

        const frequency = new Map<string, number>();
        values.forEach(val => frequency.set(val, (frequency.get(val) || 0) + 1));
        const topValues = Array.from(frequency.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const cardinality = uniqueValues.size;
        const cardinalityRatio = cardinality / values.length;

        sections.push(`Variable: ${header} (Categorical)`);
        sections.push(`Cardinality Analysis: This categorical variable contains ${cardinality.toLocaleString()} unique categories among ${values.length.toLocaleString()} observations, resulting in a cardinality ratio of ${(cardinalityRatio * 100).toFixed(1)} percent. ${cardinality === values.length ? "Each observation has a unique value, suggesting this may be an identifier rather than a predictive feature. Consider removing this variable from modeling." : cardinality > values.length * 0.8 ? "The high cardinality suggests this variable may benefit from grouping rare categories or using target encoding techniques." : cardinality < 10 ? "The low cardinality makes this variable suitable for one-hot encoding in most machine learning algorithms." : "The moderate cardinality may require careful encoding strategies such as target encoding, frequency encoding, or grouping rare categories."}`);
        sections.push("");

        if (topValues.length > 0) {
          sections.push(`Category Distribution: The most frequent categories are ${topValues.map(([val, count]) => `"${val}" (${count.toLocaleString()} occurrences, ${((count / values.length) * 100).toFixed(1)} percent)`).join(", ")}. ${topValues[0][1] / values.length > 0.9 ? "The high concentration in a single category indicates severe class imbalance, which may require resampling techniques or algorithm adjustments." : topValues[0][1] / values.length > 0.5 ? "The moderate concentration in the dominant category suggests some imbalance that should be monitored during modeling." : "The distribution shows reasonable balance across categories."}`);
          sections.push("");
        }

        if (missingCount > 0) {
          sections.push(`Missing Data: ${missingCount.toLocaleString()} observations (${missingPercent} percent) lack values for this categorical variable. Consider treating missing values as a separate category, using mode imputation, or applying more sophisticated techniques like KNN imputation if appropriate.`);
          sections.push("");
        }
      }
    }

    // Data Quality Assessment
    sections.push("");
    sections.push("DATA QUALITY AND INTEGRITY ASSESSMENT");
    sections.push("");

    const rowStrings = data.rows.map(row => row.join("|"));
    const uniqueRows = new Set(rowStrings);
    const duplicates = data.rowCount - uniqueRows.size;

    sections.push(`Overall Quality Metrics: The dataset exhibits ${completeness >= 95 ? "excellent" : completeness >= 80 ? "good" : completeness >= 60 ? "moderate" : "poor"} data quality with ${completeness.toFixed(1)} percent completeness across all variables. ${duplicates > 0 ? `Duplicate analysis identified ${duplicates.toLocaleString()} duplicate observations (${((duplicates / data.rowCount) * 100).toFixed(1)} percent of the dataset). These duplicates should be investigated to determine if they represent legitimate repeated measurements or data collection errors. Consider using df.drop_duplicates() in Python or similar methods to remove exact duplicates after validation.` : "No duplicate observations were detected, which indicates strong data integrity and quality control measures."}`);
    sections.push("");

    if (skewedColumns.length > 0) {
      sections.push(`Skewness Detected: The following variables exhibit distributional skewness: ${skewedColumns.join(", ")}. For modeling purposes, consider applying transformations such as log transformation, square root transformation, or Box-Cox transformation to normalize these distributions. This is particularly important for linear models and algorithms that assume normally distributed features.`);
      sections.push("");
    }

    if (outlierColumns.length > 0) {
      sections.push(`Outlier Presence: Outliers were detected in ${outlierColumns.length} variable${outlierColumns.length > 1 ? "s" : ""}: ${outlierColumns.join(", ")}. Depending on your analysis goals, consider strategies such as robust scaling (using RobustScaler), outlier capping (Winsorization), or using tree-based algorithms that are naturally resistant to outliers (Random Forest, XGBoost).`);
      sections.push("");
    }

    // Machine Learning Recommendations
    sections.push("");
    sections.push("MACHINE LEARNING AND MODELING RECOMMENDATIONS");
    sections.push("");

    // Recommended algorithms based on data characteristics
    const mlRecommendations: string[] = [];

    sections.push("Recommended Preprocessing Steps:");
    sections.push("");

    const preprocessingSteps: string[] = [];

    if (completeness < 95) {
      preprocessingSteps.push(`Handle missing values using appropriate imputation methods. For numeric variables, consider mean/median imputation or more advanced techniques like KNN imputation or iterative imputation (MICE). For categorical variables, mode imputation or treating missing as a separate category may be appropriate.`);
    }

    if (duplicates > 0) {
      preprocessingSteps.push(`Remove or investigate ${duplicates.toLocaleString()} duplicate observations to ensure model training on unique data points.`);
    }

    if (skewedColumns.length > 0) {
      preprocessingSteps.push(`Apply normalization transformations to skewed variables (${skewedColumns.join(", ")}). Consider log transformation for right-skewed data or power transformations for left-skewed data.`);
    }

    if (outlierColumns.length > 0) {
      preprocessingSteps.push(`Address outliers in ${outlierColumns.join(", ")} through capping, transformation, or by choosing robust algorithms. For regression tasks, consider using Huber loss or quantile regression.`);
    }

    if (numericColumns.length > 0) {
      preprocessingSteps.push(`Scale numeric features using StandardScaler for algorithms sensitive to feature scales (SVM, Neural Networks, K-Nearest Neighbors) or RobustScaler if outliers are present.`);
    }

    if (categoricalColumns.length > 0) {
      preprocessingSteps.push(`Encode categorical variables appropriately. Use one-hot encoding for low cardinality features (less than 10 categories), target encoding or frequency encoding for high cardinality features, and consider ordinal encoding if there is a natural order.`);
    }

    preprocessingSteps.forEach((step, idx) => {
      sections.push(`${idx + 1}. ${step}`);
      sections.push("");
    });

    sections.push("");
    sections.push("Suitable Machine Learning Algorithms:");
    sections.push("");

    // Determine suitable algorithms based on dataset characteristics
    if (data.rowCount >= 10000 && numericColumns.length > 5) {
      mlRecommendations.push(`Deep Learning approaches (Neural Networks, Deep Neural Networks) are viable given the substantial sample size of ${data.rowCount.toLocaleString()} observations and ${numericColumns.length} numeric features. Consider using frameworks like TensorFlow or PyTorch.`);
    }

    if (numericColumns.length > 0 && categoricalColumns.length > 0) {
      mlRecommendations.push(`Gradient Boosting algorithms (XGBoost, LightGBM, CatBoost) are highly recommended as they handle mixed data types effectively, are robust to outliers and missing values, and typically provide excellent predictive performance. CatBoost is particularly suitable given the presence of categorical variables as it handles them natively.`);
    }

    if (data.rowCount >= 1000) {
      mlRecommendations.push(`Random Forest and other ensemble methods are excellent choices, offering good performance, feature importance insights, and resistance to overfitting through bagging. They work well with the current sample size and handle non-linear relationships effectively.`);
    }

    if (completeness >= 95 && numericColumns.length > 2) {
      mlRecommendations.push(`Linear models (Linear Regression, Logistic Regression, Lasso, Ridge) are appropriate if interpretability is important. They perform best when features are normalized and outliers are addressed. Consider regularization (L1/L2) to prevent overfitting.`);
    }

    if (numericColumns.length > 0) {
      mlRecommendations.push(`Support Vector Machines (SVM) with RBF kernel can capture complex non-linear patterns, though they require feature scaling and are computationally intensive for large datasets. Consider using for datasets under 10,000 observations.`);
    }

    if (categoricalColumns.length > numericColumns.length) {
      mlRecommendations.push(`Decision Trees and Rule-based models are interpretable options that handle categorical data naturally without requiring encoding, though they may be prone to overfitting without proper regularization.`);
    }

    mlRecommendations.forEach((rec, idx) => {
      sections.push(`${idx + 1}. ${rec}`);
      sections.push("");
    });

    // Additional Recommendations
    sections.push("");
    sections.push("ADDITIONAL DATA SCIENCE RECOMMENDATIONS");
    sections.push("");

    const recommendations: string[] = [];

    if (numericColumns.length > 2) {
      recommendations.push("Perform correlation analysis and create a correlation matrix to identify multicollinearity among numeric features. High correlation (above 0.9) may necessitate feature selection or dimensionality reduction techniques like PCA.");
    }

    if (data.rowCount >= 5000) {
      recommendations.push("Implement cross-validation strategies (k-fold cross-validation with k equals 5 or 10) to ensure robust model evaluation and prevent overfitting. For time-series data, use time-series cross-validation.");
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push("Conduct feature engineering to create interaction terms between categorical and numeric variables, which may capture non-linear relationships and improve model performance.");
    }

    if (skewedColumns.length > 0 || outlierColumns.length > 0) {
      recommendations.push("Perform exploratory data analysis with visualization techniques (histograms, box plots, Q-Q plots) to better understand distributions and guide preprocessing decisions.");
    }

    recommendations.push("Split data into training, validation, and test sets using stratified sampling if dealing with classification problems. A common split is 70 percent training, 15 percent validation, and 15 percent test.");

    if (completeness < 90) {
      recommendations.push("Analyze missing data patterns using missingness heatmaps or correlation analysis. If data is Missing Not At Random (MNAR), consider specialized handling techniques or collecting additional data.");
    }

    if (numericColumns.length > 5) {
      recommendations.push("Consider feature selection techniques such as Recursive Feature Elimination (RFE), L1 regularization, or tree-based feature importance to identify the most predictive variables and reduce model complexity.");
    }

    recommendations.push("Implement hyperparameter tuning using Grid Search or Randomized Search with cross-validation to optimize model performance. For computationally expensive models, consider Bayesian optimization.");

    recommendations.push("Establish baseline models (simple heuristics or basic algorithms) before implementing complex models to ensure that added complexity provides meaningful performance gains.");

    recommendations.forEach((rec, idx) => {
      sections.push(`${idx + 1}. ${rec}`);
      sections.push("");
    });

    // Conclusion
    sections.push("");
    sections.push("CONCLUSION");
    sections.push("");
    sections.push(`This dataset comprising ${data.rowCount.toLocaleString()} observations across ${data.headers.length} variables presents ${completeness >= 90 ? "strong" : completeness >= 70 ? "adequate" : "developing"} foundations for machine learning and statistical analysis. The dataset contains ${numericColumns.length} numeric ${numericColumns.length === 1 ? "variable" : "variables"} and ${categoricalColumns.length} categorical ${categoricalColumns.length === 1 ? "variable" : "variables"}, providing ${numericColumns.length + categoricalColumns.length >= 10 ? "rich" : "sufficient"} feature space for modeling. ${outlierColumns.length > 0 ? `Attention should be given to outlier treatment in ${outlierColumns.length} variable${outlierColumns.length > 1 ? "s" : ""}, and ` : ""}${skewedColumns.length > 0 ? `distribution normalization for ${skewedColumns.length} skewed variable${skewedColumns.length > 1 ? "s" : ""}. ` : ""}By following the preprocessing recommendations and selecting appropriate algorithms based on the data characteristics outlined in this report, data scientists can develop robust predictive models and extract meaningful insights to drive data-driven decision-making.`);

    return sections.join("\n");
  }
}