document.addEventListener('DOMContentLoaded', function() {
    // Navigation toggle
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    navbarToggle.addEventListener('click', function() {
        navbarMenu.classList.toggle('active');
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navbarMenu.classList.remove('active');
            }
        });
    });

    // Order form submission
    const orderForm = document.getElementById('order-form');
    const orderMessage = document.getElementById('order-message');

    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = orderForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Collect form data
            const formData = new FormData(orderForm);

            // Submit the form
            fetch('/submit_order', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                orderMessage.textContent = data.message;
                orderMessage.className = 'order-message ' + (data.success ? 'success' : 'error');
                
                if (data.success) {
                    orderForm.reset();
                }
            })
            .catch(error => {
                orderMessage.textContent = 'An error occurred. Please try again.';
                orderMessage.className = 'order-message error';
            })
            .finally(() => {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            });
        });
    }

    // Form validation
    const validateForm = (form) => {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    };

    // Add input validation styling
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        });
    });
});
