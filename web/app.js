// Session ID for tracking state
const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// DOM Elements
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatArea = document.getElementById('chatArea');
const messages = document.getElementById('messages');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const processingModal = document.getElementById('processingModal');
const successModal = document.getElementById('successModal');
const successDetails = document.getElementById('successDetails');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const clearChatBtn = document.getElementById('clearChatBtn');

// State
let currentFile = null;
let isProcessing = false;
let currentFileType = null;

// Initialize
loadFiles();

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
sendBtn.addEventListener('click', sendQuestion);
clearChatBtn.addEventListener('click', clearChat);
questionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});
// Event handler is now dynamically attached in showSuccessModal()

// Add example question click handlers
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!questionInput.disabled) {
      questionInput.value = btn.textContent;
      sendQuestion();
    }
  });
});

// Functions
async function loadFiles() {
  try {
    const response = await fetch('/api/files');
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      displayFiles(data.files);
    }
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

function displayFiles(files) {
  if (files.length === 0) {
    fileList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📂</span>
        <p>No files uploaded yet</p>
      </div>
    `;
    return;
  }

  fileList.innerHTML = files.map(file => {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    let icon = '📄';
    if (file.type === 'CSV') icon = '📊';
    else if (file.type === 'XLSX' || file.type === 'XLS') icon = '📈';
    else if (file.type === 'PDF') icon = '📕';

    return `
      <div class="file-item" data-filename="${file.name}">
        <div class="file-name">
          <span>${icon}</span>
          <span>${file.name}</span>
        </div>
        <div class="file-meta">
          <span class="badge badge-${file.type.toLowerCase()}">${file.type}</span>
          <span>${sizeMB} MB</span>
          <button class="delete-file-btn" data-filename="${file.name}" title="Delete file">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers for file selection
  document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking on delete button
      if (e.target.classList.contains('delete-file-btn')) {
        return;
      }
      const filename = item.getAttribute('data-filename');
      processFile(filename);
    });
  });

  // Add click handlers for delete buttons
  document.querySelectorAll('.delete-file-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent file selection click
      const filename = btn.getAttribute('data-filename');
      await deleteFile(filename);
    });
  });
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
    alert('Unsupported file type. Please upload CSV, XLSX, XLS, or PDF files.');
    return;
  }

  showProcessingModal();

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      await loadFiles();
      processFile(data.filename);
    } else {
      hideProcessingModal();
      alert('Error uploading file: ' + data.message);
    }
  } catch (error) {
    hideProcessingModal();
    alert('Error uploading file: ' + error.message);
  }

  fileInput.value = '';
}

async function processFile(filename) {
  if (isProcessing) return;

  isProcessing = true;
  showProcessingModal();

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename, sessionId })
    });

    const data = await response.json();

    hideProcessingModal();

    if (data.error) {
      alert('Error processing file: ' + data.message);
      return;
    }

    currentFile = filename;

    // Highlight active file
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-filename') === filename) {
        item.classList.add('active');
      }
    });

    // Show success modal
    showSuccessModal(data, filename);

  } catch (error) {
    hideProcessingModal();
    alert('Error processing file: ' + error.message);
  } finally {
    isProcessing = false;
  }
}

function showSuccessModal(data, filename) {
  let detailsHTML = '';
  let actionsHTML = '';

  currentFileType = data.fileType;

  if (data.fileType === 'pdf') {
    detailsHTML = `
      <div class="detail-row">
        <span class="detail-label">File:</span>
        <span class="detail-value">${filename}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type:</span>
        <span class="detail-value">PDF Document</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Pages:</span>
        <span class="detail-value">${data.numPages}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tables Found:</span>
        <span class="detail-value">${data.tablesFound || 0}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Text Length:</span>
        <span class="detail-value">${(data.textLength / 1000).toFixed(1)}K chars</span>
      </div>
    `;
    actionsHTML = `<button id="closeSuccessBtn" class="btn btn-primary">Start Asking Questions</button>`;
  } else {
    detailsHTML = `
      <div class="detail-row">
        <span class="detail-label">File:</span>
        <span class="detail-value">${filename}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type:</span>
        <span class="detail-value">${data.fileType.toUpperCase()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Rows:</span>
        <span class="detail-value">${data.rowCount.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Columns:</span>
        <span class="detail-value">${data.headers.length}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Column Names:</span>
        <span class="detail-value" style="font-size: 0.85rem;">${data.headers.slice(0, 3).join(', ')}${data.headers.length > 3 ? '...' : ''}</span>
      </div>
    `;
    actionsHTML = `<button id="closeSuccessBtn" class="btn btn-primary">Extract Insights</button>`;
  }

  successDetails.innerHTML = detailsHTML;
  document.querySelector('.success-actions').innerHTML = actionsHTML;

  // Re-attach event listeners
  const closeBtn = document.getElementById('closeSuccessBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      successModal.classList.remove('active');
      if (currentFileType === 'pdf') {
        showChatArea();
      } else {
        extractInsights();
      }
    });
  }

  successModal.classList.add('active');
}

function showChatArea() {
  welcomeScreen.style.display = 'none';
  chatArea.style.display = 'flex';
  questionInput.disabled = false;
  sendBtn.disabled = false;
  questionInput.focus();

  // Add system message (only for PDFs)
  if (currentFileType === 'pdf') {
    addMessage('ai', `Great! I've processed ${currentFile}. You can now ask me questions about the document.`);
  }
}

function showProcessingModal() {
  processingModal.classList.add('active');
}

function hideProcessingModal() {
  processingModal.classList.remove('active');
}

function addMessage(type, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageDiv.innerHTML = `
    <div class="message-content">${escapeHtml(content)}</div>
    <div class="message-time">${time}</div>
  `;

  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

function addTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messages.appendChild(typingDiv);
  messages.scrollTop = messages.scrollHeight;
}

function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || isProcessing) return;

  // Only allow Q&A for PDFs
  if (currentFileType !== 'pdf') {
    alert('Q&A is only available for PDF files. For CSV/Excel files, please use the "Extract Insights" feature.');
    return;
  }

  isProcessing = true;
  questionInput.disabled = true;
  sendBtn.disabled = true;

  // Add user message
  addMessage('user', question);
  questionInput.value = '';

  // Show typing indicator
  addTypingIndicator();

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        sessionId
      })
    });

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator();

    if (data.error) {
      addMessage('ai', 'Error: ' + data.message);
    } else {
      addMessage('ai', data.answer);
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage('ai', 'Error: ' + error.message);
  } finally {
    isProcessing = false;
    questionInput.disabled = false;
    sendBtn.disabled = false;
    questionInput.focus();
  }
}

async function extractInsights() {
  if (isProcessing) return;

  isProcessing = true;
  showProcessingModal();

  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    const data = await response.json();

    hideProcessingModal();

    if (data.error) {
      alert('Error extracting insights: ' + data.message);
      return;
    }

    // Show insights in a modal or new view
    showInsightsModal(data.insights, data.rowCount, data.columnCount);

  } catch (error) {
    hideProcessingModal();
    alert('Error extracting insights: ' + error.message);
  } finally {
    isProcessing = false;
  }
}

function showInsightsModal(insights, rowCount, columnCount) {
  // Create modal HTML
  const modalHTML = `
    <div class="insights-modal-overlay" id="insightsModal">
      <div class="insights-modal">
        <div class="insights-header">
          <h2>📊 Data Science Analysis Report</h2>
          <button class="close-btn" id="closeInsightsBtn">×</button>
        </div>
        <div class="insights-meta">
          <span>Dataset: ${currentFile}</span>
          <span>${rowCount.toLocaleString()} rows, ${columnCount} columns</span>
        </div>
        <div class="insights-content">
          <pre>${escapeHtml(insights)}</pre>
        </div>
        <div class="insights-actions">
          <button class="btn btn-primary" id="downloadPdfBtn">📥 Download PDF</button>
          <button class="btn btn-secondary" id="closeInsights2Btn">Close</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add event listeners
  document.getElementById('closeInsightsBtn').addEventListener('click', closeInsightsModal);
  document.getElementById('closeInsights2Btn').addEventListener('click', closeInsightsModal);
  document.getElementById('downloadPdfBtn').addEventListener('click', downloadInsightsPDF);

  // Close on overlay click
  document.getElementById('insightsModal').addEventListener('click', (e) => {
    if (e.target.id === 'insightsModal') {
      closeInsightsModal();
    }
  });
}

function closeInsightsModal() {
  const modal = document.getElementById('insightsModal');
  if (modal) {
    modal.remove();
  }
}

async function downloadInsightsPDF() {
  if (isProcessing) return;

  isProcessing = true;
  const btn = document.getElementById('downloadPdfBtn');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generating PDF...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/insights/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    // Download the PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights_${currentFile.replace(/\.[^.]+$/, '')}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    btn.textContent = '✅ Downloaded!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);

  } catch (error) {
    alert('Error downloading PDF: ' + error.message);
    btn.textContent = originalText;
    btn.disabled = false;
  } finally {
    isProcessing = false;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

async function deleteFile(filename) {
  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    });

    const data = await response.json();

    if (data.success) {
      // Remove the file item from DOM without reloading
      const fileItem = document.querySelector(`.file-item[data-filename="${filename}"]`);
      if (fileItem) {
        fileItem.style.opacity = '0';
        fileItem.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          fileItem.remove();

          // Check if file list is now empty
          const remainingFiles = document.querySelectorAll('.file-item');
          if (remainingFiles.length === 0) {
            fileList.innerHTML = `
              <div class="empty-state">
                <span class="empty-icon">📂</span>
                <p>No files uploaded yet</p>
              </div>
            `;
          }
        }, 300);
      }

      // If the deleted file was the current file, clear the state
      if (currentFile === filename) {
        currentFile = null;
        currentFileType = null;
      }
    }
    // Silently ignore errors - no popup
  } catch (error) {
    // Silently ignore errors - no popup
  }
}

// Clear chat function
function clearChat() {
  messages.innerHTML = '';

  // Add a confirmation message
  addMessage('ai', 'Chat history cleared. How can I help you with your data?');
}

// Auto-refresh file list every 30 seconds
setInterval(loadFiles, 30000);

// Cleanup uploaded files when browser tab/window closes
window.addEventListener('beforeunload', () => {
  // Use sendBeacon for reliable delivery during page unload
  // Regular fetch may not complete before the page closes
  const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
  navigator.sendBeacon('/api/cleanup', blob);
});
