// Global state management
let currentStep = 0; // Start with loan selection
let formData = {
    loanAmount: 1000000, // Default 10 lakhs
    interestRate: 8.5,
    tenure: 84
};
let uploadedDocuments = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality with error handling
    try {
        // Show loan selection by default
        showLoanSelection();
        loadSavedData();
        setupEventListeners();
        setupAutoCalculations();
        setupTenureSlider();
        setApplicationDate();

        // Request notification permission after a short delay
        setTimeout(() => {
            requestNotificationPermission();
        }, 2000);
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Loan card selection handler
function selectLoanCard(card) {
    try {
        // Remove active class from all cards
        const allCards = document.querySelectorAll('.loan-card');
        if (allCards && allCards.length > 0) {
            allCards.forEach(c => c.classList.remove('active'));
        }

        // Add active class to selected card
        card.classList.add('active');

        // Store selection
        const loanType = card.dataset.value;
        formData.selectedLoanType = loanType;

        // Add visual feedback
        card.style.transform = 'translateY(-8px) scale(1.05)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);

        // Auto-open form after selection (delay for better UX)
        setTimeout(() => {
            startApplication();
        }, 800);

        // Show success feedback
        showSuccess(`${loanType.charAt(0).toUpperCase() + loanType.slice(1)} loan selected! Opening application form...`);

    } catch (error) {
        console.error('Error in selectLoanCard:', error);
        showError('Error selecting loan type. Please try again.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form input handlers for data persistence
    const formInputs = document.querySelectorAll('input, select, textarea');
    if (formInputs && formInputs.length > 0) {
        formInputs.forEach(input => {
            input.addEventListener('change', saveFormData);
            input.addEventListener('input', saveFormData);
        });
    }

    // Verify button handler
    const verifyBtn = document.querySelector('.verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const mobileInput = document.getElementById('mobile');
            if (mobileInput && mobileInput.value && validateMobile(mobileInput.value)) {
                showLoading();
                setTimeout(() => {
                    hideLoading();
                    alert('Verification sent to ' + mobileInput.value);
                    this.textContent = 'Verified';
                    this.style.backgroundColor = '#4CAF50';
                    this.disabled = true;
                }, 2000);
            } else {
                showError('Please enter a valid 10-digit mobile number');
            }
        });
    }

    // Existing customer dropdown handler
    const existingCustomerSelect = document.getElementById('existingCustomer');
    if (existingCustomerSelect) {
        existingCustomerSelect.addEventListener('change', function() {
            const cifField = document.getElementById('cifNumber');
            if (this.value === 'yes') {
                if (cifField) cifField.required = true;
                if (cifField && cifField.parentElement) cifField.parentElement.style.display = 'block';
            } else {
                if (cifField) cifField.required = false;
                if (cifField) cifField.value = '';
            }
        });
    }
}

// Navigation functions
function nextStep() {
    if (validateCurrentStep()) {
        saveFormData();
        currentStep++;

        // Handle special navigation
        if (currentStep === 5) {
            // After step 4 (offer), go to document upload
            updateStepDisplay();
        } else if (currentStep === 6) {
            // After document upload, go to final review
            updateStepDisplay();
        } else if (currentStep === 7) {
            // After final approval, go to thank you
            showThankYou();
            return;
        }
        else {
            updateStepDisplay();
            updateProgressStepper();
        }
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;

        if (currentStep === 5) {
            // Going back to document upload
            updateStepDisplay();
        } else if (currentStep === 6) {
            // Going back to final review
            updateStepDisplay();
        } else if (currentStep >= 1 && currentStep <= 4) {
            // Normal steps with progress stepper
            updateStepDisplay();
            updateProgressStepper();
        } else {
            // Loan selection page
            updateStepDisplay();
        }
    }
}

function startApplication() {
    try {
        // Validate that a loan type is selected
        if (!formData.selectedLoanType) {
            const activeLoanCard = document.querySelector('.loan-card.active');
            if (activeLoanCard) {
                formData.selectedLoanType = activeLoanCard.dataset.value;
            } else {
                showError('Please select a loan type before proceeding.');
                return;
            }
        }

        saveSelectionData();
        currentStep = 1;
        updateStepDisplay();
        updateProgressStepper();

        // Scroll to top for better user experience
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Show loading indicator briefly
        showLoading();
        setTimeout(() => {
            hideLoading();
        }, 500);

    } catch (error) {
        console.error('Error starting application:', error);
        showError('Error starting application. Please try again.');
    }
}

// Display management
function updateStepDisplay() {
    try {
        // Hide all step contents
        const stepContents = document.querySelectorAll('.step-content');
        if (stepContents && stepContents.length > 0) {
            stepContents.forEach(content => {
                content.style.display = 'none';
            });
        }

        // Hide/show progress stepper based on current step
        const progressStepper = document.querySelector('.progress-stepper');
        if (progressStepper) {
            if (currentStep === 0 || currentStep >= 6) {
                progressStepper.style.display = 'none';
            } else {
                progressStepper.style.display = 'flex';
            }
        }

        // Show current step
        let stepElement = null;

        if (currentStep === 0) {
            // Loan selection page
            stepElement = document.getElementById('loan-selection');
        } else if (currentStep >= 1 && currentStep <= 4) {
            // Normal application steps
            stepElement = document.getElementById(`step-${currentStep}`);
        } else if (currentStep === 5) {
            // Document upload page
            stepElement = document.getElementById('document-upload');
        } else if (currentStep === 6) {
            // Final review page
            stepElement = document.getElementById('final-review');
        } else if (currentStep === 7) {
            // Final approval page
            stepElement = document.getElementById('final-approval');
        } else if (currentStep === 8) {
            // Thank you page
            stepElement = document.getElementById('thank-you');
        }

        // Show the step element with fade-in effect
        if (stepElement) {
            stepElement.style.display = 'block';
            stepElement.style.opacity = '0';
            setTimeout(() => {
                stepElement.style.opacity = '1';
            }, 50);
        } else {
            console.warn(`Step element not found for step ${currentStep}`);
        }

        // Update EMI calculation when showing offer
        if (currentStep === 4) {
            setTimeout(() => {
                calculateEMI();
            }, 100);
        }

        // Populate final review details
        if (currentStep === 6) {
            populateReviewDetails();
        }

        // Update assistant suggestions based on current step
        if (typeof updateAssistantSuggestions === 'function') {
            updateAssistantSuggestions();
        }

    } catch (error) {
        console.error('Error updating step display:', error);
        showError('Navigation error occurred. Please refresh the page.');
    }
}

function updateProgressStepper() {
    const steps = document.querySelectorAll('.step[data-step]');
    steps.forEach(step => {
        const stepNumber = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');

        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else if (stepNumber < currentStep) {
            step.classList.add('completed');
        }
    });
}

// Validation functions
function validateCurrentStep() {
    switch (currentStep) {
        case 0:
            return validateLoanSelection();
        case 1:
            return validateBasicDetails();
        case 2:
            return validatePersonalDetails();
        case 3:
            return validateIncomeDetails();
        case 4:
            return true; // Offer page
        case 5:
            return validateDocumentUpload();
        case 6:
            return validateFinalConfirmation();
        default:
            return true;
    }
}

function validateLoanSelection() {
    const loanTypeSelected = document.querySelector('.selection-btn.active[data-value]');
    if (!loanTypeSelected) {
        showError('Please select a loan type to continue');
        return false;
    }
    return true;
}

function validateDocumentUpload() {
    const requiredDocs = ['bankStatement', 'dealerInvoice', 'gstDoc', 'itrDoc'];
    const uploadedCount = Object.keys(uploadedDocuments).length;

    if (uploadedCount < 4) {
        showError(`Please upload all required documents. ${4 - uploadedCount} documents remaining.`);
        return false;
    }
    return true;
}

function validateFinalConfirmation() {
    const confirmationCheckbox = document.getElementById('finalConfirmation');
    if (!confirmationCheckbox || !confirmationCheckbox.checked) {
        showError('Please confirm that all information is accurate and complete.');
        return false;
    }
    return true;
}

function validateBasicDetails() {
    const fullName = document.getElementById('fullName').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const loanAmount = document.getElementById('loanAmount').value.trim();
    const panNumber = document.getElementById('panNumber').value.trim();
    const agreeOVD = document.getElementById('agreeOVD').checked;

    // Clear previous errors
    clearFieldErrors();

    let isValid = true;

    if (!fullName) {
        showFieldError('fullName', 'Please enter your full name');
        isValid = false;
    }

    if (!mobile || !validateMobile(mobile)) {
        showFieldError('mobile', 'Please enter a valid 10-digit mobile number');
        isValid = false;
    }

    if (!loanAmount || parseFloat(loanAmount) <= 0) {
        showFieldError('loanAmount', 'Please enter a valid loan amount');
        isValid = false;
    } else {
        formData.loanAmount = parseFloat(loanAmount);
    }

    if (!panNumber || !validatePAN(panNumber)) {
        showFieldError('panNumber', 'Please enter a valid PAN number (e.g., ABCDE1234F)');
        isValid = false;
    }

    if (!agreeOVD) {
        showError('Please agree to validate OVD details');
        isValid = false;
    }

    return isValid;
}

function validatePersonalDetails() {
    const address = document.getElementById('address').value.trim();
    const dob = document.getElementById('dob').value;
    const fatherName = document.getElementById('fatherName').value.trim();
    const aadharNumber = document.getElementById('aadharNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const gender = document.getElementById('gender').value;
    const existingCustomer = document.getElementById('existingCustomer').value;
    const cifNumber = document.getElementById('cifNumber').value.trim();
    const residenceType = document.getElementById('residenceType').value;
    const yearsAtResidence = document.getElementById('yearsAtResidence').value;

    clearFieldErrors();

    let isValid = true;

    if (!address) {
        showFieldError('address', 'Please enter your address');
        isValid = false;
    }

    if (!dob) {
        showFieldError('dob', 'Please select your date of birth');
        isValid = false;
    }

    if (!fatherName) {
        showFieldError('fatherName', 'Please enter your father\'s name');
        isValid = false;
    }

    if (!aadharNumber || !validateAadhar(aadharNumber)) {
        showFieldError('aadharNumber', 'Please enter a valid 12-digit Aadhar number');
        isValid = false;
    }

    if (!email || !validateEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }

    if (!gender) {
        showFieldError('gender', 'Please select your gender');
        isValid = false;
    }

    if (!existingCustomer) {
        showFieldError('existingCustomer', 'Please specify if you are an existing customer');
        isValid = false;
    }

    if (existingCustomer === 'yes' && !cifNumber) {
        showFieldError('cifNumber', 'Please enter your CIF number');
        isValid = false;
    }

    if (!residenceType) {
        showFieldError('residenceType', 'Please select your residence type');
        isValid = false;
    }

    if (!yearsAtResidence || parseFloat(yearsAtResidence) < 0) {
        showFieldError('yearsAtResidence', 'Please enter valid years at current residence');
        isValid = false;
    }

    return isValid;
}

function validateIncomeDetails() {
    const employerName = document.getElementById('employerName').value.trim();
    const grossMonthlyIncome = document.getElementById('grossMonthlyIncome').value;
    const totalMonthlyObligation = document.getElementById('totalMonthlyObligation').value;
    const yearsAtEmployer = document.getElementById('yearsAtEmployer').value;
    const officialEmailID = document.getElementById('officialEmailID').value.trim();

    clearFieldErrors();

    let isValid = true;

    if (!employerName) {
        showFieldError('employerName', 'Please enter your employer name');
        isValid = false;
    }

    if (!grossMonthlyIncome || parseFloat(grossMonthlyIncome) <= 0) {
        showFieldError('grossMonthlyIncome', 'Please enter a valid gross monthly income');
        isValid = false;
    }

    if (!totalMonthlyObligation || parseFloat(totalMonthlyObligation) < 0) {
        showFieldError('totalMonthlyObligation', 'Please enter valid total monthly obligation');
        isValid = false;
    }

    if (!yearsAtEmployer || parseFloat(yearsAtEmployer) < 0) {
        showFieldError('yearsAtEmployer', 'Please enter valid years at current employer');
        isValid = false;
    }

    if (!officialEmailID || !validateEmail(officialEmailID)) {
        showFieldError('officialEmailID', 'Please enter a valid official email address');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.parentElement.classList.add('error');

        // Remove existing error message
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();

        // Add new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        field.parentElement.appendChild(errorElement);
    }
}

function clearFieldErrors() {
    const errorFields = document.querySelectorAll('.form-group.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        const errorMessage = field.querySelector('.field-error');
        if (errorMessage) errorMessage.remove();
    });

    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
}


// Data persistence functions
function saveFormData() {
    const formInputs = document.querySelectorAll('input, select, textarea');
    if (formInputs) {
        formInputs.forEach(input => {
            if (input.type !== 'checkbox') {
                formData[input.id] = input.value;
            } else {
                formData[input.id] = input.checked;
            }
        });
    }

    localStorage.setItem('loanApplicationData', JSON.stringify(formData));
}

function saveSelectionData() {
    const selections = {};
    const activeButtons = document.querySelectorAll('.selection-btn.active');
    if (activeButtons) {
        activeButtons.forEach(button => {
            const group = button.closest('.selection-group');
            const label = group.querySelector('label').textContent.toLowerCase().replace(/\s+/g, '_');
            selections[label] = button.dataset.value;
        });
    }

    formData.selections = selections;
    localStorage.setItem('loanApplicationData', JSON.stringify(formData));
}

function loadSavedData() {
    const savedData = localStorage.getItem('loanApplicationData');
    if (savedData) {
        formData = JSON.parse(savedData);

        // Restore form values
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type !== 'checkbox') {
                    element.value = formData[key];
                } else {
                    element.checked = formData[key];
                }
            }
        });

        // Restore selections
        if (formData.selections) {
            Object.keys(formData.selections).forEach(groupKey => {
                const value = formData.selections[groupKey];
                const button = document.querySelector(`[data-value="${value}"]`);
                if (button) {
                    const group = button.closest('.selection-group');
                    const buttons = group.querySelectorAll('.selection-btn');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                }
            });
        }
    }
}

// Utility functions
function resetApplication() {
    localStorage.removeItem('loanApplicationData');
    formData = {
        loanAmount: 1000000,
        interestRate: 8.5,
        tenure: 84
    };
    uploadedDocuments = {};
    currentStep = 0; // Start with loan selection
    updateStepDisplay();

    // Reset forms
    const forms = document.querySelectorAll('form');
    if (forms) {
        forms.forEach(form => form.reset());
    }

    // Reset selections
    const activeButtons = document.querySelectorAll('.selection-btn.active');
    if (activeButtons) {
        activeButtons.forEach(button => {
            button.classList.remove('active');
        });
    }

    // Reset upload boxes
    const uploadBoxes = document.querySelectorAll('.upload-box');
    if (uploadBoxes) {
        uploadBoxes.forEach(box => {
            box.classList.remove('uploaded');
            const statusElement = box.querySelector('.upload-status');
            if (statusElement) statusElement.textContent = '';
            const button = box.querySelector('.upload-btn');
            if (button) {
                button.textContent = 'Upload';
                button.style.backgroundColor = '#ff9800';
            }
        });
    }
}

function showLoanSelection() {
    currentStep = 0;

    // Hide all step contents first
    const stepContents = document.querySelectorAll('.step-content');
    if (stepContents && stepContents.length > 0) {
        stepContents.forEach(content => {
            content.style.display = 'none';
        });
    }

    // Hide progress stepper for loan selection
    const progressStepper = document.querySelector('.progress-stepper');
    if (progressStepper) {
        progressStepper.style.display = 'none';
    }

    // Show loan selection page
    const loanSelection = document.getElementById('loan-selection');
    if (loanSelection) {
        loanSelection.style.display = 'block';
    } else {
        console.error('Loan selection page not found');
    }
}

function showDocumentUpload() {
    if (currentStep < 5) {
        currentStep = 5;
        updateStepDisplay();
    }
}

function showFinalApproval() {
    currentStep = 7; // Changed from 6 to 7 to account for the new final-review step
    updateStepDisplay();
}

function proceedToFinalApproval() {
    if (validateDocumentUpload()) {
        showLoading();
        setTimeout(() => {
            hideLoading();
            currentStep = 6; // Changed from 5 to 6 to go to the new final-review step
            updateStepDisplay();
            showSuccess('Documents validated successfully! Proceeding to final review.');
        }, 1500);
    }
}

// Enhanced upload functionality
function handleFileUpload(uploadType, documentId, buttonElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError('File size should not exceed 5MB');
                return;
            }

            showLoading();

            // Simulate upload process
            setTimeout(() => {
                hideLoading();

                // Mark as uploaded
                uploadedDocuments[documentId] = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadDate: new Date()
                };

                // Update UI
                const uploadBox = document.getElementById(documentId);
                if (uploadBox) {
                    uploadBox.classList.add('uploaded');

                    const statusElement = uploadBox.querySelector('.upload-status');
                    if (statusElement) statusElement.textContent = `✓ ${file.name}`;

                    buttonElement.textContent = 'Re-upload';
                    buttonElement.style.backgroundColor = '#28a745';

                    // Check if all documents are uploaded
                    checkAllDocumentsUploaded();

                    showSuccess(`${uploadType} uploaded successfully!`);
                }
            }, 1500);
        }
    };
    input.click();
}

function checkAllDocumentsUploaded() {
    const requiredDocs = ['bankStatement', 'dealerInvoice', 'gstDoc', 'itrDoc'];
    const allUploaded = requiredDocs.every(docId => uploadedDocuments[docId]);

    const proceedButton = document.getElementById('proceedToApproval');
    if (proceedButton) {
        if (allUploaded) {
            proceedButton.style.backgroundColor = '#28a745';
            proceedButton.textContent = 'All Documents Uploaded - Proceed';
        } else {
            proceedButton.style.backgroundColor = '#f44336';
            proceedButton.textContent = `Upload ${4 - Object.keys(uploadedDocuments).length} more documents`;
        }
    }
}

// Enhanced upload functionality
function setupUploadHandlers() {
    const uploadButtons = document.querySelectorAll('.upload-btn');
    if (!uploadButtons) return;
    uploadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const uploadBox = this.closest('.upload-box');
            if (uploadBox) {
                const uploadType = uploadBox.querySelector('h3').textContent;
                const documentId = uploadBox.id;
                handleFileUpload(uploadType, documentId, this);
            }
        });
    });
}

// Call setup on DOM load
document.addEventListener('DOMContentLoaded', setupUploadHandlers);

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' && activeElement.type !== 'checkbox') {
            event.preventDefault();
            const nextBtn = document.querySelector('.next-btn');
            if (nextBtn && nextBtn.style.display !== 'none') {
                nextBtn.click();
            }
        }
    }
});

// Demo functions for testing
function simulateSteps() {
    // Fill demo data
    document.getElementById('fullName').value = 'John Doe';
    document.getElementById('mobile').value = '9876543210';
    document.getElementById('loanAmount').value = '500000';
    document.getElementById('panNumber').value = 'ABCDE1234F';
    document.getElementById('agreeOVD').checked = true;

    saveFormData();
    alert('Demo data filled. You can now navigate through the steps.');
}

// Auto-calculation setup
function setupAutoCalculations() {
    const grossIncomeInput = document.getElementById('grossMonthlyIncome');
    const bonusInput = document.getElementById('bonusOvertimeArrear');
    const totalIncomeInput = document.getElementById('totalIncome');
    const obligationInput = document.getElementById('totalMonthlyObligation');
    const netSalaryInput = document.getElementById('netMonthlySalary');

    function calculateTotals() {
        const grossIncome = parseFloat(grossIncomeInput?.value || 0);
        const bonus = parseFloat(bonusInput?.value || 0);
        const obligation = parseFloat(obligationInput?.value || 0);

        const totalIncome = grossIncome - bonus;
        const netSalary = totalIncome - obligation;

        if (totalIncomeInput) totalIncomeInput.value = totalIncome.toFixed(2);
        if (netSalaryInput) netSalaryInput.value = netSalary.toFixed(2);
    }

    [grossIncomeInput, bonusInput, obligationInput].forEach(input => {
        if (input) {
            input.addEventListener('input', calculateTotals);
            input.addEventListener('change', calculateTotals);
        }
    });
}

// Tenure slider setup
function setupTenureSlider() {
    const slider = document.getElementById('tenureSlider');
    const display = document.getElementById('tenureDisplay');
    const emiDisplay = document.getElementById('dynamicEMI');

    if (slider && display) {
        slider.addEventListener('input', function() {
            const tenure = parseInt(this.value);
            display.textContent = tenure;
            formData.tenure = tenure;
            calculateEMI();
        });
    }
}

// EMI Calculation
function calculateEMI() {
    const principal = formData.loanAmount || 1000000;
    const rate = (formData.interestRate || 8.5) / 100 / 12;
    const tenure = formData.tenure || 84;

    const emi = (principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);

    const emiDisplay = document.getElementById('dynamicEMI');
    if (emiDisplay) {
        emiDisplay.textContent = `Rs. ${Math.round(emi).toLocaleString('en-IN')} p.m.`;
    }

    // Update other displays
    const loanAmountDisplay = document.getElementById('displayLoanAmount');
    const interestRateDisplay = document.getElementById('displayInterestRate');

    if (loanAmountDisplay) {
        loanAmountDisplay.textContent = `${(principal / 100000).toFixed(1)} Lakhs`;
    }

    if (interestRateDisplay) {
        interestRateDisplay.textContent = formData.interestRate || '8.50';
    }
}

// Enhanced validation functions
function validateMobile(mobile) {
    return /^[6-9]\d{9}$/.test(mobile);
}

function validatePAN(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function validateAadhar(aadhar) {
    return /^\d{12}$/.test(aadhar.replace(/\s/g, ''));
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// UI Helper functions
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const container = document.querySelector('.step-content:not([style*="display: none"])');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'error-message';
    successDiv.style.backgroundColor = '#d4edda';
    successDiv.style.color = '#155724';
    successDiv.style.borderColor = '#c3e6cb';
    successDiv.textContent = message;

    const container = document.querySelector('.step-content:not([style*="display: none"])');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
}

function showSweetNotification(options) {
    const notification = document.createElement('div');
    notification.className = 'sweet-notification';
    notification.innerHTML = `
        <div class="sweet-notification-overlay" onclick="closeSweetNotification()"></div>
        <div class="sweet-notification-content ${options.type || 'success'}">
            <div class="sweet-notification-header">
                <div class="sweet-notification-icon">
                    ${options.type === 'success' ? '✅' : options.type === 'error' ? '❌' : 'ℹ️'}
                </div>
                <h3>${options.title || 'Notification'}</h3>
                <button class="sweet-notification-close" onclick="closeSweetNotification()">×</button>
            </div>
            <div class="sweet-notification-body">
                <p class="sweet-notification-message">${options.message || ''}</p>
                ${options.details ? `
                    <div class="sweet-notification-details">
                        ${options.details.map(detail => `<div class="detail-item">${detail}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="sweet-notification-footer">
                <button class="sweet-notification-ok" onclick="closeSweetNotification()">OK, Got it!</button>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto-close after 8 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            closeSweetNotification();
        }
    }, 8000);
}

function closeSweetNotification() {
    const notification = document.querySelector('.sweet-notification');
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Application date setup
function setApplicationDate() {
    const dateElement = document.getElementById('applicationDate');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-IN');
    }
}

// Thank you page functions
function showThankYou() {
    showLoading();
    setTimeout(() => {
        hideLoading();
        currentStep = 8; // Changed from 7 to 8 to go to the thank you page
        updateStepDisplay();

        // Show sweet completion notification
        showSweetNotification({
            title: 'Congratulations! Application Submitted Successfully! 🎉🏆',
            message: `Dear ${formData.fullName || 'Valued Customer'}, your loan application has been successfully processed and submitted.`,
            details: [
                `🆔 Reference Number: LA2025082901`,
                `📅 Submission Date: ${new Date().toLocaleDateString('en-IN')}`,
                `💰 Loan Amount: Rs. ${formData.loanAmount ? Number(formData.loanAmount).toLocaleString('en-IN') : '10,00,000'}`,
                `📋 Status: In-Principal Approval Received`,
                `⏱️ Processing Time: 24-48 hours`,
                `📱 SMS updates will be sent to ${formData.mobile || 'your registered mobile'}`,
                `📧 Email confirmations sent to ${formData.email || 'your registered email'}`,
                `🏦 Next steps will be communicated shortly`
            ],
            type: 'success'
        });

        // Show completion notification
        showCompletionNotification();
    }, 2000);
}

// Notification functions
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showSuccess('Notifications enabled! You\'ll be notified when your application is complete.');
            }
        });
    }
}

function showCompletionNotification() {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Loan Application Completed!', {
            body: 'Your loan application has been successfully submitted. Reference: LA2025082901',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMyOGE3NDUiLz4KPHBhdGggZD0iTTIwIDMyTDI4IDQwTDQ0IDI0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMyOGE3NDUiLz4KPHBhdGggZD0iTTIwIDMyTDI4IDQwTDQ0IDI0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K',
            tag: 'loan-completion',
            requireInteraction: true
        });

        notification.onclick = function() {
            window.focus();
            notification.close();
        };

        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }

    // In-page notification
    showInPageNotification();
}

function showInPageNotification() {
    const notification = document.createElement('div');
    notification.className = 'completion-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">✓</div>
            <div class="notification-text">
                <h3>Application Completed Successfully!</h3>
                <p>Your loan application has been submitted and is being processed.</p>
                <p><strong>Reference:</strong> LA2025082901</p>
            </div>
            <button class="notification-close" onclick="closeNotification(this)">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        closeNotification(notification.querySelector('.notification-close'));
    }, 8000);
}

function closeNotification(button) {
    const notification = button.closest('.completion-notification');
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function restartApplication() {
    if (confirm('Are you sure you want to start a new application? All current data will be lost.')) {
        resetApplication();
    }
}

function downloadSummary() {
    showLoading();
    setTimeout(() => {
        hideLoading();
        alert('Application summary has been downloaded to your device.');
    }, 1500);
}

function downloadApplicationForm() {
    showLoading();

    setTimeout(() => {
        hideLoading();

        // Create application form content
        const formContent = generateApplicationFormContent();

        // Create and download the file
        const blob = new Blob([formContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `Loan_Application_${formData.fullName || 'User'}_${new Date().toISOString().slice(0, 10)}.txt`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Show sweet notification for download
        showSweetNotification({
            title: 'Application Form Downloaded Successfully! 📄✅',
            message: `Your complete loan application form has been saved to your device.`,
            details: [
                `📁 File Name: ${fileName}`,
                `📊 Application Status: In-Principal Approval Received`,
                `🆔 Reference Number: LA2025082901`,
                `📋 Contains all your submitted information and loan details`,
                `💡 Keep this file safe for your records`,
                `📧 A copy has also been sent to your email address`
            ],
            type: 'success'
        });

        // Send email simulation
        setTimeout(() => {
            showSuccess(`📧 Application form copy sent to ${formData.email || 'your email'}`);
        }, 2000);
    }, 1500);
}

function generateApplicationFormContent() {
    const currentDate = new Date().toLocaleDateString('en-IN');
    const referenceNumber = 'LA2025082901';

    let content = `
LOAN APPLICATION FORM
=====================

Reference Number: ${referenceNumber}
Application Date: ${currentDate}
Application Status: In-Principal Approval Received

LOAN SELECTION
==============`;

    // Add loan selection data
    if (formData.selections) {
        Object.keys(formData.selections).forEach(key => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            content += `\n${label}: ${formData.selections[key]}`;
        });
    }

    content += `\n\nBASIC DETAILS
=============
Full Name: ${formData.fullName || 'N/A'}
Mobile: ${formData.mobile || 'N/A'}
Loan Amount: Rs. ${formData.loanAmount ? Number(formData.loanAmount).toLocaleString('en-IN') : 'N/A'}
PAN Number: ${formData.panNumber || 'N/A'}`;

    content += `\n\nPERSONAL DETAILS
================
Address: ${formData.address || 'N/A'}
Date of Birth: ${formData.dob || 'N/A'}
Father Name: ${formData.fatherName || 'N/A'}
Aadhar Number: ${formData.aadharNumber || 'N/A'}
Email: ${formData.email || 'N/A'}
Gender: ${formData.gender || 'N/A'}
Existing Customer: ${formData.existingCustomer || 'N/A'}
CIF Number: ${formData.cifNumber || 'N/A'}
Residence Type: ${formData.residenceType || 'N/A'}
Years at Current Residence: ${formData.yearsAtResidence || 'N/A'}`;

    content += `\n\nINCOME DETAILS
==============
Employer Name: ${formData.employerName || 'N/A'}
Gross Monthly Income: Rs. ${formData.grossMonthlyIncome ? Number(formData.grossMonthlyIncome).toLocaleString('en-IN') : 'N/A'}
Less: Bonus/Overtime/Arrear: Rs. ${formData.bonusOvertimeArrear ? Number(formData.bonusOvertimeArrear).toLocaleString('en-IN') : '0'}
Total Income: Rs. ${formData.totalIncome ? Number(formData.totalIncome).toLocaleString('en-IN') : 'N/A'}
Total Monthly Obligation: Rs. ${formData.totalMonthlyObligation ? Number(formData.totalMonthlyObligation).toLocaleString('en-IN') : 'N/A'}
Net Monthly Salary: Rs. ${formData.netMonthlySalary ? Number(formData.netMonthlySalary).toLocaleString('en-IN') : 'N/A'}
Years at Current Employer: ${formData.yearsAtEmployer || 'N/A'}
Official Email ID: ${formData.officialEmailID || 'N/A'}`;

    content += `\n\nLOAN OFFER DETAILS
==================
Loan Amount: Rs. ${formData.loanAmount ? Number(formData.loanAmount).toLocaleString('en-IN') : '10,00,000'}
Rate of Interest: ${formData.interestRate || '8.50'}% p.a.
Tenure: ${formData.tenure || '84'} months
Processing Charges: Rs. 1,180
Login Fee + GST: Rs. 1,180`;

    // Calculate and add EMI
    const principal = formData.loanAmount || 1000000;
    const rate = (formData.interestRate || 8.5) / 100 / 12;
    const tenure = formData.tenure || 84;
    const emi = (principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);

    content += `\nEMI: Rs. ${Math.round(emi).toLocaleString('en-IN')} per month`;

    content += `\n\nDOCUMENT UPLOAD STATUS
======================`;

    const requiredDocs = ['Bank Statement', 'Dealer Invoice', 'GST Document', 'ITR Document'];
    const uploadedDocs = Object.keys(uploadedDocuments);

    requiredDocs.forEach(doc => {
        const docId = doc.toLowerCase().replace(/\s+/g, '').replace('document', 'doc');
        const isUploaded = uploadedDocs.some(uploaded => uploaded.includes(docId.substring(0, 5)));
        content += `\n${doc}: ${isUploaded ? '✓ Uploaded' : '❌ Not Uploaded'}`;
    });

    content += `\n\nDECLARATION
===========
I hereby declare that the information provided above is true and correct to the best of my knowledge.
I authorize the bank to verify the information and process my loan application accordingly.

Applicant Signature: _____________________
Date: ${currentDate}

---
This is a system-generated application form.
For any queries, please contact our customer service.
`;

    return content;
}

// Floating Assistant Functionality
let assistantOpen = false;

function toggleAssistant() {
    const chat = document.getElementById('assistantChat');
    const button = document.getElementById('assistantButton');

    if (chat && button) {
        assistantOpen = !assistantOpen;

        if (assistantOpen) {
            chat.classList.add('open');
            button.classList.add('active');
            button.innerHTML = '×';
        } else {
            chat.classList.remove('open');
            button.classList.remove('active');
            button.innerHTML = '💬';
        }
    }
}

function closeAssistant() {
    assistantOpen = false;
    const chat = document.getElementById('assistantChat');
    const button = document.getElementById('assistantButton');

    if (chat && button) {
        chat.classList.remove('open');
        button.classList.remove('active');
        button.innerHTML = '💬';
    }
}

function addAssistantMessage(message, isUser = false) {
    const messagesContainer = document.getElementById('assistantMessages');
    if (messagesContainer) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `assistant-message ${isUser ? 'user' : 'bot'}`;
        messageDiv.textContent = message;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function askQuestion(question) {
    addAssistantMessage(question, true);

    // Simulate thinking delay
    setTimeout(() => {
        const answer = getAssistantAnswer(question);
        addAssistantMessage(answer);
    }, 500);
}

function getAssistantAnswer(question) {
    const answers = {
        'How do I fill the form?': 'Simply follow the 4-step process: 1) Enter basic details like name and mobile 2) Provide personal information 3) Add income details 4) Review your loan offer. The form saves your progress automatically!',

        'What documents do I need?': 'You\'ll need to upload: Bank Statement (last 3 months), Dealer Invoice, GST documents, and ITR. All documents should be in PDF, JPG, or PNG format, max 5MB each.',

        'How is EMI calculated?': 'EMI = [P × R × (1+R)^N] / [(1+R)^N-1], where P=Principal amount, R=Monthly interest rate, N=Tenure in months. You can adjust the tenure using the slider to see different EMI amounts.',

        'What are the eligibility criteria?': 'You should be 21-65 years old, have a stable income, good credit score (preferably 650+), and provide all required documents. The system will evaluate your application automatically.',

        'default': 'I can help you with form filling, document requirements, EMI calculations, and eligibility criteria. Feel free to ask me anything about the loan process!'
    };

    return answers[question] || answers['default'];
}

function handleAssistantKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const input = document.getElementById('assistantInput');
        if (input) {
            const question = input.value.trim();

            if (question) {
                askQuestion(question);
                input.value = '';
            }
        }
    }
}

// Smart assistant suggestions based on current step
function updateAssistantSuggestions() {
    const helpTopics = document.querySelector('.help-topics');
    if (!helpTopics) return;

    let suggestions = [];

    switch (currentStep) {
        case 1:
            suggestions = [
                'PAN format help',
                'Mobile verification',
                'Loan amount tips'
            ];
            break;
        case 2:
            suggestions = [
                'Address format',
                'Aadhar verification',
                'Residence proof'
            ];
            break;
        case 3:
            suggestions = [
                'Income calculation',
                'Document requirements',
                'Employment verification'
            ];
            break;
        case 4:
            suggestions = [
                'EMI calculation',
                'Interest rates',
                'Tenure options'
            ];
            break;
        case 5:
            suggestions = [
                'Document upload requirements',
                'File format and size',
                'Check uploaded documents'
            ];
            break;
        case 6:
            suggestions = [
                'Review my application',
                'Make changes to my details',
                'Confirm application details'
            ];
            break;
        default:
            suggestions = [
                'Fill Form',
                'Documents',
                'EMI Calculation',
                'Eligibility'
            ];
    }

    helpTopics.innerHTML = suggestions.map(topic =>
        `<span class="help-topic" onclick="askQuestion('${topic}')">${topic}</span>`
    ).join('');
}

// Update suggestions when step changes
const originalUpdateStepDisplay = updateStepDisplay;
updateStepDisplay = function() {
    originalUpdateStepDisplay();
    updateAssistantSuggestions();
};

// Populate review details
function populateReviewDetails() {
    // Loan Selection
    document.getElementById('reviewLoanType').textContent = formData.selectedLoanType || '-';

    // Basic Details
    document.getElementById('reviewFullName').textContent = formData.fullName || '-';
    document.getElementById('reviewMobile').textContent = formData.mobile || '-';
    document.getElementById('reviewLoanAmount').textContent = `Rs. ${formData.loanAmount ? Number(formData.loanAmount).toLocaleString('en-IN') : '-'}`;
    document.getElementById('reviewPanNumber').textContent = formData.panNumber || '-';

    // Personal Details
    document.getElementById('reviewAddress').textContent = formData.address || '-';
    document.getElementById('reviewDob').textContent = formData.dob || '-';
    document.getElementById('reviewFatherName').textContent = formData.fatherName || '-';
    document.getElementById('reviewAadhar').textContent = formData.aadharNumber || '-';
    document.getElementById('reviewEmail').textContent = formData.email || '-';
    document.getElementById('reviewGender').textContent = formData.gender || '-';
    document.getElementById('reviewResidenceType').textContent = formData.residenceType || '-';

    // Income Details
    document.getElementById('reviewEmployerName').textContent = formData.employerName || '-';
    document.getElementById('reviewGrossIncome').textContent = `Rs. ${formData.grossMonthlyIncome ? Number(formData.grossMonthlyIncome).toLocaleString('en-IN') : '-'}`;
    document.getElementById('reviewNetSalary').textContent = `Rs. ${formData.netMonthlySalary ? Number(formData.netMonthlySalary).toLocaleString('en-IN') : '-'}`;
    document.getElementById('reviewYearsEmployer').textContent = formData.yearsAtEmployer || '-';
    document.getElementById('reviewOfficialEmail').textContent = formData.officialEmailID || '-';

    // Loan Offer Details
    const principal = formData.loanAmount || 1000000;
    const rate = (formData.interestRate || 8.5) / 100 / 12;
    const tenure = formData.tenure || 84;
    const emi = (principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
    document.getElementById('reviewEMI').textContent = `Rs. ${Math.round(emi).toLocaleString('en-IN')} p.m.`;
    document.getElementById('reviewTenure').textContent = `${formData.tenure || 84} months`;
    document.getElementById('reviewInterestRate').textContent = `${formData.interestRate || 8.50}% p.a.`;

    // Document Status
    document.getElementById('reviewBankStatement').textContent = uploadedDocuments.bankStatement ? '✓ Uploaded' : '❌ Not Uploaded';
    document.getElementById('reviewDealerInvoice').textContent = uploadedDocuments.dealerInvoice ? '✓ Uploaded' : '❌ Not Uploaded';
    document.getElementById('reviewGstDoc').textContent = uploadedDocuments.gstDoc ? '✓ Uploaded' : '❌ Not Uploaded';
    document.getElementById('reviewItrDoc').textContent = uploadedDocuments.itrDoc ? '✓ Uploaded' : '❌ Not Uploaded';
}

// Edit section functionality
function editSection(stepNumber) {
    currentStep = stepNumber;
    updateStepDisplay();
}


// Request Call Functionality
function requestCall() {
    const modal = document.createElement('div');
    modal.className = 'call-request-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeCallRequestModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>📞 Schedule a Call Back</h3>
                <button class="modal-close" onclick="closeCallRequestModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="contact-info">
                    <p><strong>📞 24/7 Helpline:</strong> 1800-123-4567 (Toll Free)</p>
                    <p><strong>📧 Email Support:</strong> support@kalolytics.com</p>
                    <p><strong>🕒 Business Hours:</strong> 9:00 AM - 9:00 PM (Mon-Sat)</p>
                </div>
                <hr style="margin: 15px 0; border: 1px solid #e0e0e0;">
                <p>📅 Schedule a personalized call back at your convenience. Our loan experts will assist you with your application.</p>

                <form id="callRequestForm" onsubmit="return false;">
                    <div class="form-group">
                        <label for="callbackName">Full Name *</label>
                        <input type="text" id="callbackName" name="callbackName" placeholder="Enter your full name" required>
                    </div>

                    <div class="form-group">
                        <label for="callbackPhone">Phone Number *</label>
                        <input type="tel" id="callbackPhone" name="callbackPhone" placeholder="Enter your mobile number" maxlength="10" pattern="[6-9][0-9]{9}" required>
                    </div>

                    <div class="form-group">
                        <label for="callbackEmail">Email Address *</label>
                        <input type="email" id="callbackEmail" name="callbackEmail" placeholder="Enter your email address" required>
                    </div>

                    <div class="form-group">
                        <label for="loanType">Loan Type *</label>
                        <select id="loanType" name="loanType" required>
                            <option value="">Select Loan Type</option>
                            <option value="home">Home Loan</option>
                            <option value="vehicle">Car Loan</option>
                            <option value="personal">Personal Loan</option>
                            <option value="business">Business Loan</option>
                            <option value="2wheeler">Two Wheeler Loan</option>
                            <option value="creditcard">Loan on Credit Card</option>
                            <option value="securities">Loan Against Securities</option>
                            <option value="easyemi">EASYEMI on Consumer Loans</option>
                        </select>
                    </div>

                    <div class="form-row" style="display: flex; gap: 15px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="callDate">Preferred Date *</label>
                            <input type="date" id="callDate" name="callDate" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="callTime">Preferred Time *</label>
                            <select id="callTime" name="callTime" required>
                                <option value="">Select Time</option>
                                <option value="09:00">9:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="13:00">1:00 PM</option>
                                <option value="14:00">2:00 PM</option>
                                <option value="15:00">3:00 PM</option>
                                <option value="16:00">4:00 PM</option>
                                <option value="17:00">5:00 PM</option>
                                <option value="18:00">6:00 PM</option>
                                <option value="19:00">7:00 PM</option>
                                <option value="20:00">8:00 PM</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="urgency">Call Urgency</label>
                        <select id="urgency" name="urgency">
                            <option value="normal">Normal Priority</option>
                            <option value="urgent">Urgent - Call ASAP</option>
                            <option value="flexible">Flexible Timing</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="callbackMessage">Special Requirements (Optional)</label>
                        <textarea id="callbackMessage" name="callbackMessage" placeholder="Any specific queries, loan amount requirements, or special instructions..." rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="confirm-call-btn" onclick="confirmCallRequest()">📞 Schedule Call Back</button>
                <button type="button" class="cancel-call-btn" onclick="closeCallRequestModal()">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Set minimum date to today
    const dateInput = document.getElementById('callDate');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateInput) {
        dateInput.min = today.toISOString().split('T')[0];
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }

    // Add form event listeners
    const form = document.getElementById('callRequestForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmCallRequest();
        });
        
        // Add Enter key handler for form submission
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                confirmCallRequest();
            }
        });
    }

    // Focus on name input
    setTimeout(() => {
        const nameInput = document.getElementById('callbackName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 100);
}

function closeCallRequestModal() {
    const modal = document.querySelector('.call-request-modal');
    if (modal) {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    }
}

function confirmCallRequest() {
    try {
        const name = document.getElementById('callbackName')?.value?.trim() || '';
        const phone = document.getElementById('callbackPhone')?.value?.trim() || '';
        const email = document.getElementById('callbackEmail')?.value?.trim() || '';
        const loanType = document.getElementById('loanType')?.value || '';
        const callDate = document.getElementById('callDate')?.value || '';
        const callTime = document.getElementById('callTime')?.value || '';
        const urgency = document.getElementById('urgency')?.value || 'normal';
        const message = document.getElementById('callbackMessage')?.value?.trim() || '';

        console.log('Form data:', { name, phone, email, loanType, callDate, callTime, urgency, message });

        // Clear any existing errors
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());

        // Validation with better error handling
        if (!name) {
            showCallRequestError('Please enter your full name');
            document.getElementById('callbackName')?.focus();
            return;
        }

        if (!phone || !validateMobile(phone)) {
            showCallRequestError('Please enter a valid 10-digit mobile number');
            document.getElementById('callbackPhone')?.focus();
            return;
        }

        if (!email || !validateEmail(email)) {
            showCallRequestError('Please enter a valid email address');
            document.getElementById('callbackEmail')?.focus();
            return;
        }

        if (!loanType) {
            showCallRequestError('Please select a loan type');
            document.getElementById('loanType')?.focus();
            return;
        }

        if (!callDate) {
            showCallRequestError('Please select your preferred date');
            document.getElementById('callDate')?.focus();
            return;
        }

        if (!callTime) {
            showCallRequestError('Please select your preferred time');
            document.getElementById('callTime')?.focus();
            return;
        }

        // Validate date is not in the past
        const selectedDate = new Date(callDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showCallRequestError('Please select a future date for your call');
            document.getElementById('callDate')?.focus();
            return;
        }

        // Disable the submit button to prevent double submission
        const submitBtn = document.querySelector('.confirm-call-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Scheduling...';
        }

        showLoading();

        setTimeout(() => {
            try {
                hideLoading();
                closeCallRequestModal();

                const formattedDate = new Date(callDate).toLocaleDateString('en-IN');
                const formattedTime = callTime;
                const urgencyText = urgency === 'urgent' ? ' (Urgent Priority)' : urgency === 'flexible' ? ' (Flexible Timing)' : '';

                // Generate unique appointment ID
                const appointmentId = 'CALL-' + Math.random().toString(36).substr(2, 9).toUpperCase();

                // Show sweet success notification
                showSweetNotification({
                    title: 'Call Scheduled Successfully! 🎉📅',
                    message: `Thank you ${name}! Your call has been scheduled and confirmed.`,
                    details: [
                        `🆔 Appointment ID: ${appointmentId}`,
                        `📞 Phone: ${phone}`,
                        `📧 Email: ${email}`,
                        `💼 Loan Type: ${loanType.charAt(0).toUpperCase() + loanType.slice(1)} Loan`,
                        `📅 Date: ${formattedDate}`,
                        `🕐 Time: ${formattedTime}${urgencyText}`,
                        message ? `💬 Special Requirements: ${message}` : '',
                        '📱 SMS confirmation will be sent shortly',
                        '📧 Email reminder will be sent 1 hour before the call'
                    ].filter(Boolean),
                    type: 'success'
                });

                // Show browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Call Scheduled Successfully', {
                        body: `Your call is scheduled for ${formattedDate} at ${formattedTime}`,
                        icon: '/logo/01.png',
                        tag: 'call-scheduled'
                    });
                }

                // Send confirmation messages simulation
                setTimeout(() => {
                    showSuccess(`📧 Confirmation email sent to ${email} with appointment details`);
                }, 2000);

                setTimeout(() => {
                    showSuccess(`📱 SMS confirmation sent to ${phone} with appointment ID: ${appointmentId}`);
                }, 4000);

            } catch (error) {
                console.error('Error in success handling:', error);
                hideLoading();
                showCallRequestError('An error occurred while scheduling your call. Please try again.');
            }

        }, 2000);

    } catch (error) {
        console.error('Error in confirmCallRequest:', error);
        hideLoading();
        showCallRequestError('An error occurred while processing your request. Please try again.');
        
        // Re-enable the submit button
        const submitBtn = document.querySelector('.confirm-call-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📞 Schedule Call Back';
        }
    }
}

function showCallRequestError(message) {
    // Remove existing error messages in modal
    const existingErrors = document.querySelectorAll('.call-request-modal .error-message');
    existingErrors.forEach(error => error.remove());

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
        padding: 12px;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 14px;
        animation: fadeIn 0.3s ease;
    `;
    errorDiv.textContent = message;

    // Insert error message at the top of modal body
    const modalBody = document.querySelector('.call-request-modal .modal-body');
    if (modalBody) {
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    } else {
        // Fallback to regular error display
        showError(message);
    }
}

// Export functions for global access
window.nextStep = nextStep;
window.prevStep = prevStep;
window.startApplication = startApplication;
window.showLoanSelection = showLoanSelection;
window.showDocumentUpload = showDocumentUpload;
window.showFinalApproval = showFinalApproval;
window.proceedToFinalApproval = proceedToFinalApproval;
window.resetApplication = resetApplication;
window.simulateSteps = simulateSteps;
window.showThankYou = showThankYou;
window.restartApplication = restartApplication;
window.downloadSummary = downloadSummary;
window.downloadApplicationForm = downloadApplicationForm;
window.toggleAssistant = toggleAssistant;
window.closeAssistant = closeAssistant;
window.askQuestion = askQuestion;
window.handleAssistantKeyPress = handleAssistantKeyPress;
window.selectLoanCard = selectLoanCard;
window.requestCall = requestCall;
window.closeCallRequestModal = closeCallRequestModal;
window.confirmCallRequest = confirmCallRequest;
window.closeSweetNotification = closeSweetNotification;
window.populateReviewDetails = populateReviewDetails;
window.editSection = editSection;